const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";

const queryClient = new AWS.TimestreamQuery();

async function fetchDataFromTimestream(
  interval:string,
  port: string,
  limit:number,
  plant_id:string
) {

  const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  console.log("configMap --->",configMap)
  
  const timestream_table= configMap.plants[plant_id].timestream_table;
  console.log("timestream_table--->",timestream_table);
  const timestream_database= configMap.plants[plant_id].timestream_database;
  console.log("timestream_table--->",timestream_database);


  const valid_ports= configMap.plants.p123.valid_ports;
  console.log("valid_ports--->",valid_ports);


  
  // Function to find an item in the configMap
function findItem(key) {
  if (configMap.plants.p123.hasOwnProperty(key)) {
      return configMap.plants.p123[key];
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


 let timeSelected;

if (intervalExpression === '1d'){
  timeSelected=10;
}
else if (intervalExpression === '7d') {
  timeSelected=360;
}

else if (intervalExpression === '30d') {
  timeSelected=1440;
}
else if (intervalExpression === '365d') {
  timeSelected=43800;
}
else{
  timeSelected=1;
}





console.log("timeSelected --------------",timeSelected);




 



  //    WITH x07_data AS (
  //     SELECT
  //         bin(time, 10m) AS time_interval,
  //         AVG(Pressure_bar) AS X07_Pressure_bar
  //     FROM "AquaControl"."alon"
  //     WHERE time between ago(1d) and now() 
  //     AND port='x07'
  //     GROUP BY bin(time, 10m)
  // ),
  // x01_data AS (
  //     SELECT
  //         bin(time, 10m) AS time_interval,
  //         AVG(Pressure_bar) AS X01_Pressure_bar
  //     FROM "AquaControl"."alon"
  //     WHERE time between ago(1d) and now() 
  //     AND port='x01'
  //     GROUP BY bin(time, 10m)
  // )
  // SELECT
  //     x07_data.time_interval AS time_interval,
  //     x07_data.X07_Pressure_bar - x01_data.X01_Pressure_bar AS X07_X01_Difference
  // FROM
  //     x07_data
  // JOIN
  //     x01_data ON x07_data.time_interval = x01_data.time_interval
  // ORDER BY x07_data.time_interval DESC
  


//   WITH x07_data AS (
//     SELECT
//         bin(time, 10m) AS time_interval,
//         AVG(Pressure_bar) AS X07_Pressure_bar
//     FROM "AquaControl"."plant_alon"
//     WHERE time between ago(1d) and now() 
//     AND port='x07'
//     GROUP BY bin(time, 10m)
// ),
// x01_data AS (
//     SELECT
//         bin(time, 10m) AS time_interval,
//         AVG(Pressure_bar) AS X01_Pressure_bar
//     FROM "AquaControl"."plant_alon"
//     WHERE time between ago(1d) and now() 
//     AND port='x01'
//     GROUP BY bin(time, 10m)
// )
// SELECT
//     x07_data.time_interval AS time_interval,
//     x01_data.X01_Pressure_bar - x07_data.X07_Pressure_bar  AS X07_X01_Difference
// FROM
//     x07_data
// JOIN
//     x01_data ON x07_data.time_interval = x01_data.time_interval
// ORDER BY x07_data.time_interval DESC



           // Previous x01 -x07/x05 difference query, this query not recognized values if System is off
            // Previous x01 -x07/x05 difference query, this query not recognized values if System is off

      //  const queryStringPessureBarDifference = `
      //   WITH ${port}_data AS (
      //  SELECT bin(time, ${timeSelected}m) AS time_interval,
      //  AVG(Pressure_bar) AS ${port}_Pressure_bar
      //  FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
      //  WHERE time between ago(${intervalExpression} + 10m) and now() 
      //  AND port='${port}'
      //  GROUP BY bin(time, ${timeSelected}m)
      //  ),
      //  x01_data AS (
      //  SELECT bin(time, ${timeSelected}m) AS time_interval,
      //  AVG(Pressure_bar) AS X01_Pressure_bar
      //  FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
      //  WHERE time between ago(${intervalExpression} + 10m) and now() 
      //  AND port='x01'
      //  GROUP BY bin(time, ${timeSelected}m)
      //  )
      //  SELECT
      //  ${port}_data.time_interval AS time_interval,
      //  x01_data.X01_Pressure_bar - ${port}_data.${port}_Pressure_bar  AS pressure_bar_difference
      //  FROM ${port}_data
      //  JOIN
      //  x01_data ON ${port}_data.time_interval = x01_data.time_interval
      //  ORDER BY ${port}_data.time_interval DESC
      //   `;



            // current x01 -x07/x05 difference query, this query recognized values if System is off and put value zero in bin 
            // current x01 -x07/x05 difference query, this query recognized values if System is off and put value zero in bin


      
//       const queryStringPessureBarDifference =`WITH ${validPortValue}_data AS (
//     SELECT
//         bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
//         AVG(Pressure_bar) AS ${validPortValue}_Pressure_bar
//     FROM "${timestream_database}"."${timestream_table}"
//     WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now() 
//       AND port = '${validPortValue}'
//     GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
// ),
// x01_data AS (
//     SELECT
//         bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
//         AVG(Pressure_bar) AS X01_Pressure_bar
//     FROM "${timestream_database}"."${timestream_table}"
//     WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now() 
//       AND port = 'x01'
//     GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
// )
// SELECT
//     COALESCE(${validPortValue}_data.time_interval, x01_data.time_interval) AS time_interval,
//     COALESCE(x01_data.X01_Pressure_bar, 0) - COALESCE(${validPortValue}_data.${validPortValue}_Pressure_bar, 0) AS  pressure_bar_difference
// FROM
//     ${validPortValue}_data
// FULL OUTER JOIN
//     x01_data ON ${validPortValue}_data.time_interval = x01_data.time_interval
// ORDER BY time_interval DESC
//       `      

      
  
      // New Query x07/x05 difference query with Flow_Lpmin, if Flow_Lpmin < 0
      // New Query x07/x05 difference query with Flow_Lpmin, if Flow_Lpmin < 0

      const queryStringPessureBarDifference =
   `WITH ${validPortValue}_data AS (
    SELECT
        bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
        AVG(Pressure_bar) AS ${validPortValue}_Pressure_bar
    FROM "${timestream_database}"."${timestream_table}"
    WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now() 
      AND port = '${validPortValue}'
    GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
    ORDER BY bin(date_add('hour', 1, time), ${timeSelected}m) DESC
),
x01_data AS (
    SELECT
        bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
        AVG(Pressure_bar) AS x01_Pressure_bar
    FROM "${timestream_database}"."${timestream_table}"
    WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now() 
      AND port = 'x01'
    GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
    ORDER BY bin(date_add('hour', 1, time), ${timeSelected}m) DESC
),
flow_data AS (
    SELECT 
        AVG(Flow_Lpmin) AS Flow_Lpmin ,
        bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval
    FROM "${timestream_database}"."${timestream_table}"
    WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now() 
      AND port = 'x08'
      GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m) 
      ORDER BY bin(date_add('hour', 1, time), ${timeSelected}m) DESC
      
)

SELECT
    COALESCE(${validPortValue}_data.time_interval, x01_data.time_interval) AS time_interval,
    CASE 
        WHEN fd.Flow_Lpmin < 0 THEN 0 
        ELSE COALESCE(x01_data.x01_Pressure_bar, 0) - COALESCE(${validPortValue}_data.${validPortValue}_Pressure_bar, 0) 
    END AS pressure_bar_difference
FROM
    ${validPortValue}_data
FULL OUTER JOIN
    x01_data ON ${validPortValue}_data.time_interval = x01_data.time_interval
LEFT JOIN
    (SELECT time_interval, MAX(Flow_Lpmin) AS Flow_Lpmin
     FROM flow_data
     GROUP BY time_interval) fd ON COALESCE(${validPortValue}_data.time_interval, x01_data.time_interval) = fd.time_interval
ORDER BY time_interval DESC
   `


//    WITH x07_data AS (
//     SELECT
//         bin(date_add('hour', 1, time), 10m) AS time_interval,
//         AVG(Pressure_bar) AS x07_Pressure_bar
//     FROM "AquaControl"."plant_alon"
//     WHERE time BETWEEN ago(1d + 10m) AND now() 
//       AND port = 'x07'
//     GROUP BY bin(date_add('hour', 1, time), 10m)
//     ORDER BY bin(date_add('hour', 1, time), 10m) DESC
// ),
// x01_data AS (
//     SELECT
//         bin(date_add('hour', 1, time), 10m) AS time_interval,
//         AVG(Pressure_bar) AS x01_Pressure_bar
//     FROM "AquaControl"."plant_alon"
//     WHERE time BETWEEN ago(1d + 10m) AND now() 
//       AND port = 'x01'
//     GROUP BY bin(date_add('hour', 1, time), 10m)
//     ORDER BY bin(date_add('hour', 1, time), 10m) DESC
// ),
// flow_data AS (
//     SELECT 
//         AVG(Flow_Lpmin) AS Flow_Lpmin ,
//         bin(date_add('hour', 1, time), 10m) AS time_interval
//     FROM "AquaControl"."plant_alon"
//     WHERE time BETWEEN ago(1d) AND now() 
//       AND port = 'x08'
//       GROUP BY bin(date_add('hour', 1, time), 10m) 
//       ORDER BY bin(date_add('hour', 1, time), 10m) DESC
      
// )

// SELECT
//     COALESCE(x07_data.time_interval, x01_data.time_interval) AS time_interval,
//     CASE 
//         WHEN fd.Flow_Lpmin < 0 THEN 0 
//         ELSE COALESCE(x01_data.x01_Pressure_bar, 0) - COALESCE(x07_data.x07_Pressure_bar, 0) 
//     END AS pressure_bar_difference
// FROM
//     x07_data
// FULL OUTER JOIN
//     x01_data ON x07_data.time_interval = x01_data.time_interval
// LEFT JOIN
//     (SELECT time_interval, MAX(Flow_Lpmin) AS Flow_Lpmin
//      FROM flow_data
//      GROUP BY time_interval) fd ON COALESCE(x07_data.time_interval, x01_data.time_interval) = fd.time_interval
// ORDER BY time_interval DESC





  //    WITH x07_data AS (
  //     SELECT
  //         bin(time, 10m) AS time_interval,
  //         AVG(Pressure_bar) AS X07_Pressure_bar
  //     FROM "AquaControl"."plant_alon"
  //     WHERE time BETWEEN ago(1d + 10m) AND now() 
  //       AND port = 'x07'
  //     GROUP BY bin(time, 10m)
  // ),
  // x01_data AS (
  //     SELECT
  //         bin(time, 10m) AS time_interval,
  //         AVG(Pressure_bar) AS X01_Pressure_bar
  //     FROM "AquaControl"."plant_alon"
  //     WHERE time BETWEEN ago(1d + 10m) AND now() 
  //       AND port = 'x01'
  //     GROUP BY bin(time, 10m)
  // )
  // SELECT
  //     COALESCE(x07_data.time_interval, x01_data.time_interval) AS time_interval,
  //     COALESCE(x01_data.X01_Pressure_bar, 0) - COALESCE(x07_data.X07_Pressure_bar, 0)  AS pressure_bar_difference
  // FROM
  //     x07_data
  // FULL OUTER JOIN
  //     x01_data ON x07_data.time_interval = x01_data.time_interval
  // ORDER BY time_interval DESC

 

    // Log the query string for debugging
  console.log("Query String:----------", queryStringPessureBarDifference);


      const queryDatabase = async (queryString: string) => {
   

    const params = { QueryString: queryString };
  
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
    
    try{
     
      const StringPessureBarDifferencePort = await queryDatabase(queryStringPessureBarDifference);

      console.log("StringPessureBarDifferencePort-----",StringPessureBarDifferencePort);
    
      return StringPessureBarDifferencePort;
    
    
    
    }catch(err){
    
    
    }
    
    

  
}

export const handler:APIGatewayProxyHandler = async (event:any) => {
  console.log("Event:-----", event);
  const interval = event?.interval || "week";
  const plant_id = event?.plant_id || null;
  const port = event?.port || null;
  const limit = Number(event?.limit) || 1000;
  console.log("Interval:----------", interval);
  console.log("port:----------", port);
  console.log("limit:----------", Number(limit));
  console.log("plant_id:----------", plant_id);
  try {
    const data = await fetchDataFromTimestream(interval,port,limit,plant_id);
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
