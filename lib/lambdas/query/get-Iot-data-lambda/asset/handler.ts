const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";

//import config from "../../config"

const queryClient = new AWS.TimestreamQuery();

async function fetchDataFromTimestream(
  interval: string,
  sensor: string,
  port: string,
  zone: string,
  sensorname: string,
  // plant: string,
  plant_id:string,
  limit:number
) {

    

  const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  console.log("configMap --->",configMap)
  const config_plant_id= configMap.plants[plant_id].plant_id;
  console.log("plant_id--->",config_plant_id);
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



  let intervalExpression: string;
   
   
   


  //  Only get config data then pass into it

  // const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  // const plant_name= configMap.get(plant_id).plant_name;
  // const timepstreamTable= configMap.get(plant_id).timestream_table;
  // const validPorts= configMap.get(plant_id).valid_ports;
  
// Determine the interval expression based on the interval provided
  
switch (interval) {
  case "week":
    intervalExpression = "7d";
    break;
  case "month":
    intervalExpression = "30d";
    break;
  case "year":
    intervalExpression = "365d";
    break;
  case "day":
    intervalExpression = "1d";
    break;
    case "current":
      intervalExpression = "0m";
      break;
  default:
    throw new Error("Invalid interval");
}



 // Log the interval expression for debugging
 console.log(`Interval Expression:---------- ${intervalExpression}`);


 
   

   

  let queryString: string;
  if (sensor && validPortValue && zone && plant && sensorname ) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND sensor_type = '${sensor}' 
      AND port = '${validPortValue}' 
      AND zone = '${zone}'
      AND plant = '${plant}'
      AND sensor_name = '${sensorname}'
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  } else if(zone && !sensor && !validPortValue && !plant && !sensorname ){
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND zone = '${zone}'
      ORDER BY time DESC
      LIMIT ${limit}
        
    `;

    
  }
  
  else if(plant && !zone && !sensor && !validPortValue && !sensorname){
    // for each valid port , we need to get data for all valid ports against interval_bin
    // if for example x04 data is not
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND plant = '${plant}'
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }

  else if(plant && validPortValue && !zone && !sensor && !sensorname) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND plant = '${plant}'
      AND port = '${validPortValue}'
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }

    else if(plant && validPortValue && zone && !sensor && !sensorname) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND plant = '${plant}'
      AND port = '${validPortValue}' 
      AND zone = '${zone}' 
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }



  else if(plant && validPortValue && sensor && !zone && !sensorname) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND plant = '${plant}'
      AND port = '${validPortValue}'
      AND sensor_type = '${sensor}' 
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }

  else if(plant && validPortValue && sensor && zone && !sensorname) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND plant = '${plant}'
      AND port = '${validPortValue}'
      AND sensor_type = '${sensor}' 
      AND zone = '${zone}' 
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }


  else if(plant && validPortValue && sensor && sensorname && !zone) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND plant = '${plant}'
      AND port = '${validPortValue}'
      AND sensor_type = '${sensor}' 
      AND sensor_name = '${sensorname}'
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }
  
  
  
  
  else if(sensor && !plant && !validPortValue && !sensorname && !zone){
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND sensor_type = '${sensor}'
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }
  else if(validPortValue && !sensor && !plant && !sensorname && !zone) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND port = '${validPortValue}'
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }
  else if(sensorname && !validPortValue && !sensor && !plant && !zone) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND sensor_name = '${sensorname}'
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }

  // else if(port && Flow_Lpmin=1 ) {
  //   queryString = `
  
  //     SELECT Flow_Lpmin FROM "${timestream_database}"."${timestream_table}"
  //     WHERE time between ago(${intervalExpression}) and now()   
  //     AND port = '${port}'
  //     AND Flow_Lpmin <= 1 
  //     ORDER BY time DESC
  //   `;
  // }

  else if(!sensorname && !validPortValue && !sensor && !plant && zone) {
    queryString = `
      SELECT * FROM "${timestream_database}"."${timestream_table}" 
      WHERE time between ago(${intervalExpression} + 10m) and now()   
      AND zone = '${zone}'
      ORDER BY time DESC
       LIMIT ${limit}
    `;
  }
     
  else {
    queryString = `
    SELECT * FROM "${timestream_database}"."${timestream_table}" 
    WHERE time between ago(${intervalExpression} + 10m) and now()   
    ORDER BY time DESC
     LIMIT ${limit}
  `;

  }
  // Log the query string for debugging
  console.log("Query String:----------", queryString);

  const params = {
    QueryString: queryString,
  };

  try{
    const queryResults = await queryClient.query(params).promise();

    console.log("queryResults------", queryResults);
  
    const items = queryResults.Rows.map((row:any) => {
      const data = {};
      row.Data.forEach((datum, index) => {
       data[queryResults.ColumnInfo[index].Name] = datum.ScalarValue;
      });
      return data;
    });
  
    return items; // Return the data as a list


    //console.log("items----",items);


  }
  catch(err){

    console.log("Error querying Timestream:", err);
    
  }
 
}

export const handler:APIGatewayProxyHandler = async (event:any) => {
  console.log("Event:-----", event);
  const interval = event?.interval || "week";
  const sensor_type = event?.sensor || null;
  const port = event?.port || null;
  const zone = event?.zone || null;
  const sensor = event?.sensor_name || null;
  const plant_id = event?.plant_id || null;
  const limit = Number(event?.limit) || 1000;
  console.log("Interval:----------", interval);
  console.log("sensor_type:----------", sensor_type);
  console.log("port:----------", port);
  console.log("zone:----------", zone);
  console.log("sensor_name:----------", sensor);
  console.log("plant_idp123:----------", plant_id);
  console.log("limit:----------", Number(limit));
  try {
    const data = await fetchDataFromTimestream(interval, sensor_type, port, zone,sensor,plant_id,limit);
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
