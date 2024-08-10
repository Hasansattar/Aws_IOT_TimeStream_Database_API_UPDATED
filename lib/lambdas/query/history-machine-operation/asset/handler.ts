const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";
const queryClient = new AWS.TimestreamQuery();

async function fetchDataFromTimestream(interval: string, limit: number,plant_id: string) {



  const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  console.log("configMap --->",configMap)
  
  const timestream_table= configMap.plants[plant_id].timestream_table;
  console.log("timestream_table--->",timestream_table);
  const timestream_database= configMap.plants[plant_id].timestream_database;
  console.log("timestream_table--->",timestream_database);

  // const valid_ports= configMap.plants.p123.valid_ports;
  // console.log("valid_ports--->",valid_ports);




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






  // let machineSeconds;

  // if (timeSelected == 10) {
  //   machineSeconds = 10 * 60;    // 10 minutes in seconds
  // } else if (timeSelected == 360) {
  //   machineSeconds = 6 * 3600;     // 6 Hours in seconds
  // } else if (timeSelected == 1440) {
  //   machineSeconds = 24 * 3600;   // 1 day in seconds
  // } else if (timeSelected == 43800) {
  //   machineSeconds = 30* 24* 3600;  // 1 month in seconds
  // } else {
  //   machineSeconds = 1;
  // }



//   SELECT 
//     time_interval,
//     Machine1,
//     Flow_Lpmin_status,
//     working_hours
// FROM (
//     SELECT
//         bin(time, 1d) AS time_interval,
//         Flow_Lpmin AS Machine1,
//         CASE 
//             WHEN Flow_Lpmin < 1 THEN 'false'
//             ELSE 'true'
//         END AS Flow_Lpmin_status,
//         SUM(
//             CASE 
//                 WHEN Flow_Lpmin > 1 THEN 10.0 / 60.0
//                 ELSE 0 
//             END
//         ) OVER (PARTITION BY bin(time, 1d)) AS working_hours,
//         ROW_NUMBER() OVER (PARTITION BY bin(time, 1d) ORDER BY time) AS rn
//     FROM "AquaControl"."alon"
//     WHERE time BETWEEN ago(30d + 10m) AND now() 
//     AND port='x08'
// ) AS subquery
// WHERE rn = 1
// ORDER BY time_interval DESC
// LIMIT 100;

  console.log("timeSelected --------------", timeSelected);


//   SELECT time_interval, Machine1, Flow_Lpmin_status
// FROM (
//     SELECT
//         bin(time, 10m) AS time_interval,
//         Flow_Lpmin AS Machine1,
//         CASE 
//             WHEN Flow_Lpmin < 1 THEN 'false'
//             ELSE 'true'
//         END AS Flow_Lpmin_status,
//         ROW_NUMBER() OVER (PARTITION BY bin(time, 10m) ORDER BY time) AS rn
//     FROM "AquaControl"."alon"
//     WHERE time BETWEEN ago(1d + 10m) AND now() 
//     AND port='x08'
// ) AS subquery
// WHERE rn = 1
// ORDER BY time_interval DESC
// LIMIT 100



// -------------------------------------------------------------------

// WITH FlowData AS (
//   SELECT
//       bin(time, 6h) AS time_interval,
//       Flow_Lpmin AS Machine1,
//       CASE
//           WHEN Flow_Lpmin IS NULL OR Flow_Lpmin < 1 THEN 'false'
//           ELSE 'true'
//       END AS Flow_Lpmin_status,
//       time,
//       LAG(CASE
//               WHEN Flow_Lpmin IS NULL OR Flow_Lpmin < 1 THEN 'false'
//               ELSE 'true'
//           END, 1, 'false') OVER (ORDER BY bin(time, 6h))
//   FROM "AquaControl"."alon"
//   WHERE time BETWEEN ago(7d) AND now()
//   AND port='x08'
// ),

// MachineOperation AS (
//   SELECT
//       time_interval,
//       Machine1,
//       Flow_Lpmin_status,
//       time,
//       CASE
//           WHEN Flow_Lpmin_status = 'true'  THEN time
//           ELSE NULL
//       END AS operation_start_stop
//   FROM FlowData
//   WHERE Machine1 IS NOT NULL
// )

// SELECT
//   time_interval,
//   Machine1,
//   Flow_Lpmin_status,
//   SUM(CASE
//           WHEN operation_start_stop IS NOT NULL THEN 6 * 3600  
//           ELSE 0
//       END) AS operation_seconds
// FROM MachineOperation
// GROUP BY time_interval, Machine1, Flow_Lpmin_status
// ORDER BY time_interval DESC
// LIMIT 100

//   const queryStringhistoryMachineOperation = `WITH FlowData AS (
//     SELECT
//         bin(time, ${timeSelected}m) AS time_interval,
//         Flow_Lpmin AS Machine1,
//         CASE
//             WHEN Flow_Lpmin IS NULL OR Flow_Lpmin < 1 THEN 'false'
//             ELSE 'true'
//         END AS Flow_Lpmin_status,
//         time,
//         LAG(CASE
//                 WHEN Flow_Lpmin IS NULL OR Flow_Lpmin < 1 THEN 'false'
//                 ELSE 'true'
//             END, 1, 'false') OVER (ORDER BY bin(time, ${timeSelected}m)) 
//     FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
//     WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now()
//     AND port='x08'
// ),

// MachineOperation AS (
//     SELECT
//         time_interval,
//         Machine1,
//         Flow_Lpmin_status,
//         time,
       
//         CASE
//             WHEN Flow_Lpmin_status = 'true'  THEN time
//             ELSE NULL
//         END AS operation_start_stop
//     FROM FlowData
//     WHERE Machine1 IS NOT NULL
// )

// SELECT
//     time_interval,
//     Machine1,
//     Flow_Lpmin_status,
//     SUM(CASE
//             WHEN operation_start_stop IS NOT NULL THEN ${machineSeconds}  
//             ELSE 0
//         END) AS machine_operation_seconds
// FROM MachineOperation
// GROUP BY time_interval, Machine1, Flow_Lpmin_status
// ORDER BY time_interval DESC
// LIMIT ${limit}
           

//     `;

// Query the data using selected time interval and then collect rows for how many rows 
// where Flow_Lpmin > 1 then multiply the by 10 , beacuse each record os added into 10 minute
//Also Check the status of flow_Lpmin if the Flow_Lpmin > 1 then true else false

//     const queryStringhistoryMachineOperation =  `WITH FlowData AS (SELECT
//     BIN(time, ${timeSelected}m) AS time_interval,
//     MAX(CASE WHEN Flow_Lpmin > 1 THEN 'true' ELSE 'false' END) AS Flow_Lpmin_status,
//     SUM(CASE WHEN Flow_Lpmin > 1 THEN 10 ELSE 0 END) AS OperatingTime_minutes,
//     SUM(CASE WHEN Flow_Lpmin > 1 THEN 1 ELSE 0 END) AS Working_row,             
//     AVG(Flow_Lpmin) AS Machine1
// FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
// WHERE time between ago(${intervalExpression} + 10m) and now()
//     AND port = 'x08'
// GROUP BY BIN(time, ${timeSelected}m)
// ORDER BY  BIN(time, ${timeSelected}m)
// )

//  SELECT
//         time_interval,
//         Machine1,
//         Flow_Lpmin_status,
//         OperatingTime_minutes,
//         Working_row
//    FROM FlowData
// GROUP BY time_interval, Machine1, Flow_Lpmin_status, OperatingTime_minutes, Working_row
// ORDER BY time_interval DESC
// LIMIT ${limit}`;


// previous Operating Hours query for x08,if machine is not running it will not received any value
// previous Operating Hours query for x08,if machine is not running it will not received any value

//  const queryStringhistoryMachineOperation =`WITH FlowData AS (
//     SELECT
//         BIN(time, ${timeSelected}m) AS time_interval,
//         MAX(CASE WHEN Flow_Lpmin > 1 THEN 'true' ELSE 'false' END) AS Flow_Lpmin_status,
//         SUM(CASE WHEN Flow_Lpmin > 1 THEN 10 ELSE 0 END) / 60.0 AS OperatingTime_hours,
//         SUM(CASE WHEN Flow_Lpmin > 1 THEN 1 ELSE 0 END) AS Working_row,
//         AVG(Flow_Lpmin) AS Machine1
//     FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
//     WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now()
//         AND port = 'x08'
//     GROUP BY BIN(time, ${timeSelected}m)
//     ORDER BY BIN(time, ${timeSelected}m)
// ),
// TotalOperatingTime_hours AS (
//     SELECT
//         SUM(OperatingTime_hours) AS TotalOperatingTime_hours
//     FROM FlowData
// )
// SELECT
//     fd.time_interval,
//     fd.Machine1,
//     fd.Flow_Lpmin_status,
//     fd.OperatingTime_hours,
//     fd.Working_row,
//     tot.TotalOperatingTime_hours
// FROM FlowData fd
// CROSS JOIN TotalOperatingTime_hours tot
// ORDER BY fd.time_interval DESC
// LIMIT ${limit}`;


// Current Operating Hours query for x08,if machine is not running it will  received  value=0
// Current Operating Hours query for x08,if machine is not running it will  received  value=0




 const queryStringhistoryMachineOperation =
 `WITH time_intervals AS (
    SELECT
        BIN(date_add('hour', 1, time), ${timeSelected}m) AS time_interval
    FROM 
        "${timestream_database}"."${timestream_table}"
    WHERE
        time BETWEEN ago(${intervalExpression} + 10m) AND now()
    GROUP BY 
        BIN(date_add('hour', 1, time), ${timeSelected}m)
),
FlowData AS (
    SELECT
        BIN(date_add('hour', 1, time), ${timeSelected}m) AS time_interval,
        MAX(CASE WHEN Flow_Lpmin > 1 THEN 'true' ELSE 'false' END) AS Flow_Lpmin_status,
        SUM(CASE WHEN Flow_Lpmin > 1 THEN 10 ELSE 0 END) / 60.0 AS OperatingTime_hours,
        SUM(CASE WHEN Flow_Lpmin > 1 THEN 1 ELSE 0 END) AS Working_row,
        AVG(Flow_Lpmin) AS Machine1
    FROM 
        "${timestream_database}"."${timestream_table}"
    WHERE 
        time BETWEEN ago(${intervalExpression} + 10m) AND now()
        AND port = 'x08'
    GROUP BY 
        BIN(date_add('hour', 1, time), ${timeSelected}m)
),
TotalOperatingTime_hours AS (
    SELECT
        SUM(OperatingTime_hours) AS TotalOperatingTime_hours
    FROM 
        FlowData
),
FormattedFlowData AS (
    SELECT
        time_interval,
        Machine1,
        Flow_Lpmin_status,
        OperatingTime_hours,
        Working_row,
        TotalOperatingTime_hours,
        CAST(FLOOR(OperatingTime_hours) AS INTEGER) AS OperatingHours,
        CAST((OperatingTime_hours - FLOOR(OperatingTime_hours)) * 60 AS INTEGER) AS OperatingMinutes,
        CAST(FLOOR(TotalOperatingTime_hours) AS INTEGER) AS TotalOperatingHours,
        CAST((TotalOperatingTime_hours - FLOOR(TotalOperatingTime_hours)) * 60 AS INTEGER) AS TotalOperatingMinutes
    FROM
        FlowData
    CROSS JOIN 
        TotalOperatingTime_hours
)
SELECT
    ti.time_interval,
    COALESCE(fd.Machine1, 0) AS Machine1,
    COALESCE(fd.Flow_Lpmin_status, 'false') AS Flow_Lpmin_status,
    COALESCE(CONCAT(CAST(fd.OperatingHours AS VARCHAR), ' hours ', CAST(fd.OperatingMinutes AS VARCHAR), ' minutes'), '0 hours 0 minutes') AS OperatingTime_hours,
    COALESCE(fd.Working_row, 0) AS Working_row,
    COALESCE(CONCAT(CAST(fd.TotalOperatingHours AS VARCHAR), ' hours ', CAST(fd.TotalOperatingMinutes AS VARCHAR), ' minutes'), '0 hours 0 minutes') AS TotalOperatingTime_hours
FROM 
    time_intervals ti
LEFT JOIN 
    FormattedFlowData fd ON ti.time_interval = fd.time_interval
ORDER BY 
    ti.time_interval DESC
LIMIT ${limit}`






// WITH time_intervals AS (
//   -- Generate expected time intervals (360 minutes each)
//   SELECT
//       BIN(time, 360m) AS time_interval
//   FROM 
//       "AquaControl"."plant_alon"
//   WHERE
//       time BETWEEN ago(7d + 10m) AND now()
//   GROUP BY 
//       BIN(time, 360m)
// ),
// FlowData AS (
//   SELECT
//       BIN(time, 360m) AS time_interval,
//       MAX(CASE WHEN Flow_Lpmin > 1 THEN 'true' ELSE 'false' END) AS Flow_Lpmin_status,
//       SUM(CASE WHEN Flow_Lpmin > 1 THEN 10 ELSE 0 END) / 60.0 AS OperatingTime_hours,
//       SUM(CASE WHEN Flow_Lpmin > 1 THEN 1 ELSE 0 END) AS Working_row,
//       AVG(Flow_Lpmin) AS Machine1
//   FROM 
//       "AquaControl"."plant_alon"
//   WHERE 
//       time BETWEEN ago(7d + 10m) AND now()
//       AND port = 'x08'
//   GROUP BY 
//       BIN(time, 360m)
// ),
// TotalOperatingTime_hours AS (
//   SELECT
//       SUM(OperatingTime_hours) AS TotalOperatingTime_hours
//   FROM 
//       FlowData
// ),
// FormattedFlowData AS (
//   SELECT
//       time_interval,
//       Machine1,
//       Flow_Lpmin_status,
//       OperatingTime_hours,
//       Working_row,
//       TotalOperatingTime_hours,
//       CAST(FLOOR(OperatingTime_hours) AS INTEGER) AS OperatingHours,
//       CAST((OperatingTime_hours - FLOOR(OperatingTime_hours)) * 60 AS INTEGER) AS OperatingMinutes,
//       CAST(FLOOR(TotalOperatingTime_hours) AS INTEGER) AS TotalOperatingHours,
//       CAST((TotalOperatingTime_hours - FLOOR(TotalOperatingTime_hours)) * 60 AS INTEGER) AS TotalOperatingMinutes
//   FROM
//       FlowData
//   CROSS JOIN 
//       TotalOperatingTime_hours
// )
// SELECT
//   ti.time_interval,
//   COALESCE(fd.Machine1, 0) AS Machine1,
//   COALESCE(fd.Flow_Lpmin_status, 'false') AS Flow_Lpmin_status,
//   COALESCE(CONCAT(CAST(fd.OperatingHours AS VARCHAR), ' hours ', CAST(fd.OperatingMinutes AS VARCHAR), ' minutes'), '0 hours 0 minutes') AS OperatingTime_hours,
//   COALESCE(fd.Working_row, 0) AS Working_row,
//   COALESCE(CONCAT(CAST(fd.TotalOperatingHours AS VARCHAR), ' hours ', CAST(fd.TotalOperatingMinutes AS VARCHAR), ' minutes'), '0 hours 0 minutes') AS TotalOperatingTime_hours
// FROM 
//   time_intervals ti
// LEFT JOIN 
//   FormattedFlowData fd ON ti.time_interval = fd.time_interval
// ORDER BY 
//   ti.time_interval DESC
// LIMIT 1000


  

  // Log the query string for debugging
  console.log("Query String:----------", queryStringhistoryMachineOperation);

  const queryDatabase = async (queryString: string) => {
    const params = { QueryString: queryString };

    try {
      const queryResults = await queryClient.query(params).promise();

      console.log("queryResults------", queryResults);

      const items = queryResults.Rows.map((row: any) => {
        const data = {};
        row.Data.forEach((datum, index) => {
          data[queryResults.ColumnInfo[index].Name] = datum.ScalarValue;
        });
        return data;
      });

      return items; // Return the data as a list

      //console.log("items----",items);
    } catch (err) {
      console.log("Error querying Timestream:", err);
    }
  };

  try {
    const StringhistoryMachineOperation = await queryDatabase(
      queryStringhistoryMachineOperation
    );

    console.log(
      "StringhistoryMachineOperation-----",
      StringhistoryMachineOperation
    );
    
    


      
        return StringhistoryMachineOperation;

    


  } catch (err) {}
}

export const handler: APIGatewayProxyHandler = async (event: any) => {
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
    const data = await fetchDataFromTimestream(interval, limit,plant_id);
    console.log("data----------------", data);
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
      body: JSON.stringify({ error: "Error fetching datas" }),
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    };
  }
};



