const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";




const queryClient = new AWS.TimestreamQuery();







async function fetchDataFromTimestream(
  interval:string,
  port:string,
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
  //Determine the interval expression based on the interval provided
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

  if (intervalExpression === "1d") {
    timeSelected = 10;
  } else if (intervalExpression === "7d") {
    timeSelected = 360;
  } else if (intervalExpression === "30d") {
    timeSelected = 1440;
  } else if (intervalExpression === "365d") {
    timeSelected = 43800;
  } else {
    timeSelected = 1;
  }

  console.log("timeSelected --------------", timeSelected);


   // ================================START_ QUERY FUNCTIONS  ================================

  const queryDatabase = async (queryString: string) => {
    const params = { QueryString: queryString };

    try {
      const queryResults = await queryClient.query(params).promise();
      if (queryResults.Rows.length > 0) {
        const avgValue = queryResults.Rows[0].Data[0].ScalarValue;
        return parseFloat(avgValue);
      } else {
        return 0;
      }
    } catch (error) {
      console.error("Error querying Timestream:", error);
      return 0;
    }
  };

   
  const queryDatabase1 = async (queryString: string) => {
    const params = { QueryString: queryString };

    const queryResults = await queryClient.query(params).promise();

    console.log("queryResults------", queryResults);

    try {
      const items = queryResults.Rows.map((row: any) => {
        const data = {};
        row.Data.forEach((datum, index) => {
          data[queryResults.ColumnInfo[index].Name] = datum.ScalarValue;
        });
        return data;
      });

      return items; // Return the data as a list

      // console.log("items----",items);
    } catch (error) {
      console.error("Error querying Timestream:", error);
      return 0;
    }
  };


  

    
// previous Flow Histort Query, that will not get value againt timestamp of flow if data not received in database
// previous Flow Histort Query, that will not get value againt timestamp of flow if data not received in database

//  const queryStringHistoryOfWaterflow = `
      //  SELECT
      //  time_interval,
      //  Flow_Lpmin
      //  FROM (
      //  SELECT bin(time, ${timeSelected}m) AS time_interval,
      //   Flow_Lpmin,
  
      //   ROW_NUMBER() OVER (PARTITION BY bin(time, ${timeSelected}m) ORDER BY time) AS rn
      //   FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
      //   WHERE time between ago(${intervalExpression} + 10m) and now() 
      //   AND port='${port}'
      //    ) AS subquery
      //    WHERE rn = 1
      //    ORDER BY time_interval DESC
      //    LIMIT ${limit}`;





     // Current Flow Histort Query, that will  get value againt timestamp of flow if data not received in database
     // Cureent Flow Histort Query, that will  get value againt timestamp of flow if data not received in database
    

      
        //Previous Query That will record current valueof  Flow_lpmin but not record data ,even if machine is not running
        //Previous Query That will record current valueof  Flow_lpmin but not record data ,even if machine is not running
         const queryStringHistoryOfWaterflow =  `WITH time_intervals AS (
    
    SELECT
        bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval
    FROM
        "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
    WHERE
        time BETWEEN ago(${intervalExpression} + 10m) AND now()
    GROUP BY
        bin(date_add('hour', 1, time), ${timeSelected}m)
),
actual_data AS (
    SELECT 
        bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
        Flow_Lpmin,
        ROW_NUMBER() OVER (PARTITION BY bin(date_add('hour', 1, time), ${timeSelected}m) ORDER BY time) AS rn
    FROM 
        "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
    WHERE 
        time BETWEEN ago(${intervalExpression} + 10m) AND now() 
        AND port='${port}'
)
SELECT
    ti.time_interval,
    COALESCE(ad.Flow_Lpmin, 0) AS Flow_Lpmin
FROM 
    time_intervals ti
LEFT JOIN 
    actual_data ad ON ti.time_interval = ad.time_interval AND ad.rn = 1
ORDER BY 
    ti.time_interval DESC
LIMIT ${limit}
        ` 


        //New Query That will record current valueof  Flow_lpmin even if machine is not running
        //New Query That will record current valueof  Flow_lpmin even if machine is not running

// const queryStringHistoryOfWaterflow =`WITH time_intervals AS (
//     SELECT
//         bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval
//     FROM
//         "${timestream_database}"."${timestream_table}"
//     WHERE
//         time BETWEEN ago(${intervalExpression} + 10m) AND now()
//     GROUP BY
//         bin(date_add('hour', 1, time), ${timeSelected}m)
// ),
// all_intervals AS (
//     SELECT
//         bin(now() - (seq * 10m), 10m) AS time_interval
//     FROM
//         (SELECT ROW_NUMBER() OVER () - 1 AS seq
//          FROM "${timestream_database}"."${timestream_table}"
//          LIMIT 144) -- Generates 144 intervals for the last 24 hours
//     WHERE
//         bin(now() - (seq * 10m), ${timeSelected}m) BETWEEN ago(${intervalExpression} + 10m) AND now()
// ),
// actual_data AS (
//     SELECT 
//         bin(date_add('hour', 1, time),  ${timeSelected}m) AS time_interval,
//         Flow_Lpmin,
//         ROW_NUMBER() OVER (PARTITION BY bin(date_add('hour', 1, time),  ${timeSelected}m) ORDER BY time) AS rn
//     FROM 
//         "${timestream_database}"."${timestream_table}"
//     WHERE 
//         time BETWEEN ago(${intervalExpression}  + 10m) AND now() 
//         AND port='${validPortValue}'
// )
// SELECT
//     ai.time_interval,
//     COALESCE(ad.Flow_Lpmin, 0) AS Flow_Lpmin
// FROM 
//     all_intervals ai
// LEFT JOIN 
//     actual_data ad ON ai.time_interval = ad.time_interval AND ad.rn = 1
// ORDER BY 
//     ai.time_interval DESC
// LIMIT ${limit}
// `






//  new query Flow history using Totilizer for Week,Month,Year


// const queryStringHistoryOfWaterflowTotilizer =
// `WITH date_series AS (
//   SELECT bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval
//   FROM "${timestream_database}"."${timestream_table}"
//   WHERE time BETWEEN ago(${intervalExpression}  + 10m) AND now()
//   GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
// ),
// binned_data AS (
//   SELECT 
//       bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
//       MAX(Totaliser1_m3) AS Totaliser1_m3
//   FROM "${timestream_database}"."${timestream_table}"
//   WHERE time BETWEEN ago(${intervalExpression}  + 10m) AND now() 
//         AND port = '${validPortValue}'
//   GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
// ),
// data_with_lag AS (
//   SELECT
//     ds.time_interval,
//     COALESCE(bd.Totaliser1_m3, 0) AS Totaliser1_m3,
//     LEAD(COALESCE(bd.Totaliser1_m3, 0), 1) OVER (ORDER BY ds.time_interval) AS next_value,
//     LAG(COALESCE(bd.Totaliser1_m3, 0), 1) OVER (ORDER BY ds.time_interval) AS prev_value,
//     -- Find the last non-zero value for central difference calculation
//     LAST_VALUE(CASE WHEN COALESCE(bd.Totaliser1_m3, 0) != 0 THEN COALESCE(bd.Totaliser1_m3, 0) END) 
//     IGNORE NULLS 
//     OVER (ORDER BY ds.time_interval ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS last_non_zero_value
//   FROM date_series ds
//   LEFT JOIN binned_data bd ON ds.time_interval = bd.time_interval
// )
// SELECT
//   time_interval,
//   CASE
//     WHEN Totaliser1_m3 = 0 THEN 0 -- Set central_difference to 0 when current value is 0
//     WHEN prev_value = 0 THEN Totaliser1_m3 - last_non_zero_value
//     ELSE Totaliser1_m3 - prev_value
//   END AS Flow_Lpmin
// FROM data_with_lag
// ORDER BY time_interval DESC
// LIMIT ${limit}
// `

const queryStringHistoryOfWaterflowTotilizer =
`WITH date_series AS (
  SELECT bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(${intervalExpression}  + 10m) AND now()
  GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
),
binned_data AS (
  SELECT 
      bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
      MAX(Totaliser1_m3) AS Totaliser1_m3
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(${intervalExpression}  + 10m) AND now() 
        AND port = '${validPortValue}'
  GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
),
data_with_lag AS (
  SELECT
    ds.time_interval,
    COALESCE(bd.Totaliser1_m3, 0) AS Totaliser1_m3,
    LEAD(COALESCE(bd.Totaliser1_m3, 0), 1) OVER (ORDER BY ds.time_interval) AS next_value,
    LAG(COALESCE(bd.Totaliser1_m3, 0), 1) OVER (ORDER BY ds.time_interval) AS prev_value,
    LAG(COALESCE(bd.Totaliser1_m3, 0), 2) OVER (ORDER BY ds.time_interval) AS prev_prev_value,
    LAG(COALESCE(bd.Totaliser1_m3, 0), 3) OVER (ORDER BY ds.time_interval) AS prev_prev_prev_value,
    LAG(COALESCE(bd.Totaliser1_m3, 0), 4) OVER (ORDER BY ds.time_interval) AS prev_prev_prev_prev_value,
    LAG(COALESCE(bd.Totaliser1_m3, 0), 5) OVER (ORDER BY ds.time_interval) AS prev_prev_prev_prev_prev_value,
    LAG(COALESCE(bd.Totaliser1_m3, 0), 6) OVER (ORDER BY ds.time_interval) AS prev_prev_prev_prev_prev_prev_value,
    -- Find the last non-zero value for central difference calculation
    COALESCE(
      LAST_VALUE(CASE WHEN COALESCE(bd.Totaliser1_m3, 0) > 0 THEN COALESCE(bd.Totaliser1_m3, 0) END)
      IGNORE NULLS 
      OVER (ORDER BY ds.time_interval ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
      1 -- Default value greater than 0
    ) AS last_non_zero_value
  FROM date_series ds
  LEFT JOIN binned_data bd ON ds.time_interval = bd.time_interval
)
SELECT
  time_interval,
  CASE
    WHEN Totaliser1_m3 = 0 AND prev_value = 0 THEN 0 
    WHEN Totaliser1_m3 = 0 AND prev_value = 0 THEN 0 
    WHEN Totaliser1_m3 = 0 AND prev_value !=0 AND next_value !=0 THEN next_value - prev_value 
    WHEN Totaliser1_m3 != 0 AND prev_value =0 AND next_value !=0 AND prev_prev_value !=0 THEN Totaliser1_m3 - prev_prev_value 
    WHEN Totaliser1_m3 != 0 AND prev_value =0 AND next_value !=0 AND prev_prev_value !=0 THEN Totaliser1_m3 - prev_prev_value 
    
    WHEN Totaliser1_m3 != 0 AND prev_value =0 AND next_value !=0 AND prev_prev_value = 0 AND prev_prev_prev_value != 0 THEN Totaliser1_m3 - prev_prev_prev_value 
    WHEN Totaliser1_m3 != 0 AND prev_value =0 AND next_value !=0 AND prev_prev_value = 0 AND prev_prev_prev_value = 0 AND prev_prev_prev_prev_value != 0 THEN Totaliser1_m3 - prev_prev_prev_prev_value
    
     WHEN Totaliser1_m3 != 0 AND prev_value =0 AND next_value !=0 AND prev_prev_value = 0 AND prev_prev_prev_value = 0 AND prev_prev_prev_prev_value = 0 AND prev_prev_prev_prev_prev_value != 0  THEN Totaliser1_m3 - prev_prev_prev_prev_prev_value
    WHEN Totaliser1_m3 != 0 AND prev_value =0 AND next_value !=0 AND prev_prev_value = 0 AND prev_prev_prev_value = 0 AND prev_prev_prev_prev_value = 0 AND prev_prev_prev_prev_prev_value = 0 AND prev_prev_prev_prev_prev_prev_value != 0  THEN Totaliser1_m3 - prev_prev_prev_prev_prev_prev_value
    
    
    WHEN Totaliser1_m3 = 0 THEN 0
    WHEN prev_value = 0 THEN Totaliser1_m3 - last_non_zero_value
    WHEN Totaliser1_m3 != 0 AND prev_value = 0 THEN Totaliser1_m3 - last_non_zero_value
    WHEN Totaliser1_m3 != 0 AND prev_value =0 THEN Totaliser1_m3 - prev_prev_value 
    ELSE Totaliser1_m3 - prev_value
  END AS Flow_Lpmin
FROM data_with_lag
ORDER BY time_interval DESC

`


// ((previous)) Flow history using Totilizer for Week,Month,Year
      
//         const queryStringHistoryOfWaterflowTotilizer =  `WITH date_series AS (
//   SELECT bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval
//   FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
//   WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now()
//   GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)
// ),
// binned_data AS (
//   SELECT 
//       bin(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
//       MAX(Totaliser1_m3) AS Totaliser1_m3  -- Use MAX or SUM based on your requirement
//   FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
//   WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now() 
//         AND port = '${port}'
//   GROUP BY bin(date_add('hour', 1, time), ${timeSelected}m)  -- Ensure grouping by the binned time interval
// )
// SELECT
//   ds.time_interval,

//   COALESCE(bd.Totaliser1_m3, 0) - LAG(COALESCE(bd.Totaliser1_m3, 0), 1) OVER (ORDER BY ds.time_interval) AS Flow_Lpmin
// FROM date_series ds
// LEFT JOIN binned_data bd ON ds.time_interval = bd.time_interval
// ORDER BY ds.time_interval DESC
// LIMIT ${limit}
//         `




        // WITH date_series AS (
        //   SELECT bin(time, 1d) AS time_interval
        //   FROM "AquaControl"."plant_alon"
        //   WHERE time BETWEEN ago(30d) AND now()
        //   GROUP BY bin(time, 1d)
        // ),
        // binned_data AS (
        //   SELECT 
        //       bin(time, 1d) AS time_interval,
        //       MAX(Totaliser1_m3) AS Totaliser1_m3  -- Use MAX or SUM based on your requirement
        //   FROM "AquaControl"."plant_alon"
        //   WHERE time BETWEEN ago(30d) AND now() 
        //         AND port = 'x08'
        //   GROUP BY bin(time, 1d)  -- Ensure grouping by the binned time interval
        // )
        // SELECT
        //   ds.time_interval,
        //   COALESCE(bd.Totaliser1_m3, 0) AS Totaliser1_m3,
        //   COALESCE(bd.Totaliser1_m3, 0) - LAG(COALESCE(bd.Totaliser1_m3, 0), 1) OVER (ORDER BY ds.time_interval) AS central_difference
        // FROM date_series ds
        // LEFT JOIN binned_data bd ON ds.time_interval = bd.time_interval
        // ORDER BY ds.time_interval DESC



      // ========================================================

    
    
      

  try {

    const WaterFlowLpminHistoryWater= await queryDatabase1(
      queryStringHistoryOfWaterflow
    );

    
    const WaterFlowLpminHistoryWaterTotilizer= await queryDatabase1(
      queryStringHistoryOfWaterflowTotilizer
    );
   



    if(interval=="day"){
      const data = WaterFlowLpminHistoryWater;
      console.log("data--------", data);
      return data;

    }
    else{
       const data = WaterFlowLpminHistoryWaterTotilizer;
       console.log("data--------", data);
       return data;
    }
  
    

    
 
 

    

  } catch (error) {
    console.log("DATA ERORRORO----------", error);
  }
  //  =====================================================
}

export const handler = async (event: any) => {
  console.log("Event:-----", event);
  const interval = event?.interval || "week";
  console.log("Interval:----------", interval);
  const port = event?.port || "x08";
  console.log("port:----------", port);
  const limit = Number(event?.limit)|| 100;
  console.log("limit:----------", limit);

  const plant_id = event?.plant_id || null;
  console.log("plant_id:----------", plant_id);

  try {
    const data = await fetchDataFromTimestream(interval,port,limit,plant_id);
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
      body: JSON.stringify({ error: "Error fetching dataa" }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
};
