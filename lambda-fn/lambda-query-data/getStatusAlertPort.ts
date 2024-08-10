const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";
// import { DateTime } from 'luxon';

//const { DateTime } = require('luxon');

// const utcTime = DateTime.fromISO("2024-08-02T18:50:00.000Z", { zone: 'UTC' });
// const localTime = utcTime.setZone('CET'); // or any desired timezone

// console.log( "sdsdsdsd--->",localTime.toString());
// const currentTime =   DateTime.now();
// console.log( "currentTimedsdsdsdsd--->",currentTime);


const queryClient = new AWS.TimestreamQuery();


async function fetchDataFromTimestream(port:string,plant_id:string) {

  const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  console.log("configMap --->",configMap)
  const plant_ids= configMap.plants[plant_id].plant_id;
  console.log("plant_id--->",plant_ids);
  const plant= configMap.plants[plant_id].plant_name;
  console.log("plant_name--->",plant);
  const timestream_table= configMap.plants[plant_id].timestream_table;
  console.log("timestream_table--->",timestream_table);
  const timestream_database= configMap.plants[plant_id].timestream_database;
  console.log("timestream_table--->",timestream_database);

  const valid_ports= configMap.plants[plant_id].valid_ports;
  console.log("valid_ports--->",valid_ports);

// Function to find an item in the configMap
function findItem(key) {
  if (configMap.plants[plant_id].hasOwnProperty(key)) {
      return configMap.plants[plant_id][key];
  } else {
      return `Key "${key}" not found in configMap`;
  }
}

// Example usage
const keyToFind = 'valid_ports';
const value = findItem(keyToFind);
console.log(`Value for ${keyToFind}:`, value);

const isPortValid = value.includes(port);

console.log(`Is port valid for plant ?:`, isPortValid); // Outputs: true




// Get the valid port value if it exists
let validPortValue = null;
if (isPortValid) {
   validPortValue = port; // Store the valid port value
}

console.log(`Port ${validPortValue} is valid for plant `);











  // const currentTime =   DateTime.now().setZone('CET'); // Set to Central European Time
  // console.log("currentTime---->",currentTime)
  

  // const currentTimeInterval = currentTime.minus({ minutes: currentTime.minute % 10 }).toISO(); // Get the start of the current 10-minute interval
  // console.log("currentTimeInterval---->",currentTimeInterval)
  // const initialTime=JSON.stringify(currentTimeInterval);

  // console.log("initialTime---->",initialTime);
  
  // const tenMinutesAgo = currentTime.minus({ minutes: 10 });
  // console.log("tenMinutesAgo --->",tenMinutesAgo); // Output: "

  
  
  
  const portStatusList =[];
 // for  valid for in config file ,


  const queryStringStatusAlertPorts = `
WITH TimeIntervals AS (
  SELECT 
      bin(time, 10m) as time_bin 
  FROM "${timestream_database}"."${timestream_table}" 
  WHERE time BETWEEN ago(10m) AND now()
  GROUP BY bin(time, 10m)
),
PortStatus AS (
  SELECT 
      ti.time_bin,
      '${validPortValue}' AS port,
      COALESCE(MAX(CASE 
                  WHEN pa.plant = '${plant}' AND pa.port = '${validPortValue}' AND pa.DeviceStatus = 'DeviceIsOK' THEN 1 
                  ELSE 0 
              END), 0) as is_active,
      COUNT(pa.time) as timestamp_count
  FROM TimeIntervals ti
  LEFT JOIN "${timestream_database}"."${timestream_table}"  pa
  ON ti.time_bin = bin(pa.time, 10m)
  GROUP BY ti.time_bin
)
SELECT 
  time_bin,
  port,
  CASE 
      WHEN is_active = 1 AND timestamp_count > 0 THEN 'Active'
      ELSE 'Inactive'
  END as connection_status
FROM PortStatus
ORDER BY time_bin`

  
// ======================END WATER PRODUCTION TOTILIZER==============================

  const queryDatabase = async (queryString: string) => {
    const params = { QueryString: queryString };

    try {
      const queryResults = await queryClient.query(params).promise();
      console.log("queryResults",queryResults)
      const items = queryResults.Rows.map((row:any) => {
        const data = {};
        row.Data.forEach((datum, index) => {
         data[queryResults.ColumnInfo[index].Name] = datum.ScalarValue;
        });
        return data;
      });
    
      return items;
    } catch (error) {
      console.error("Error querying Timestream:", error);
      return 0;
    }
  };



  
      
  try {

   
    // Querying the data
    const statusAlertPortForplant = await queryDatabase(queryStringStatusAlertPorts);
    
    
    console.log("statusAlertPortForplant--------------", statusAlertPortForplant);
    const connectionStatus = statusAlertPortForplant === 0;


   const dataArray = [];

    // If no record for the current time interval, create a default entry
    if (connectionStatus) {
      const defaultEntry = {
        // time_bin: currentTimeInterval,
        port: `${validPortValue}`,
        connection_status: 'Inactive' // Default status
      };
      dataArray.push(defaultEntry);

      return dataArray;

      console.log('No data for the current interval. Creating default entry:', defaultEntry);
      // You can push this to an array or handle it as needed
    } else {
      console.log('Query results:' );

      const data = {
          port: statusAlertPortForplant[0].port,
          connection_status: statusAlertPortForplant[0].connection_status,
         
         };

      return data;
    }
  


    // return data;
  } catch (error) {
    console.log("Error", error);
  }
  //  =====================================================
}

export const handler = async (event: any) => {
  console.log("Event:-----", event);
  const port = event?.port || null;
  console.log("port:----------", port);
  const plant_id = event?.plant_id || null;
  console.log("plant_id:----------", plant_id);

  try {
    const data = await fetchDataFromTimestream(port,plant_id);
    console.log("hasan---Data:----------", data);
    return data;
    // return {
    //   statusCode: 200,
    //   body: JSON.stringify(data),
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Access-Control-Allow-Origin": "*",
    //   },
    // };
  } catch (error) {
    console.error("Error fetching data:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error fetching data" }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
};
