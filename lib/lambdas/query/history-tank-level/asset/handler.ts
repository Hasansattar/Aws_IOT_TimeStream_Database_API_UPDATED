// WITH FlowX08 AS (
//   SELECT 
//       bin(time, 10m) AS time_interval,
//       AVG(Flow_Lpmin) AS avgFlowLpminX08
//   FROM "AquaControl"."alon"
//   WHERE time BETWEEN ago(1d) AND now()
//     AND port = 'x08'
//   GROUP BY bin(time, 10m)
// ),

// FlowX04 AS (
//   SELECT 
//       bin(time, 10m) AS time_interval,
//       AVG(Flow_Lpmin) AS avgFlowLpminX04
//   FROM "AquaControl"."alon"
//   WHERE time BETWEEN ago(1d) AND now()
//     AND port = 'x04'
//   GROUP BY bin(time, 10m)
// )

// SELECT 
//   f04.time_interval,
//   CASE 
//       WHEN COALESCE(f08.avgFlowLpminX08, 0) > 1 THEN 9000 - f04.avgFlowLpminX04 + COALESCE(f08.avgFlowLpminX08, 0)
//       ELSE 9000 - f04.avgFlowLpminX04
//   END AS currentTankLevel
// FROM 
//   FlowX04 f04
// LEFT JOIN 
//   FlowX08 f08
// ON 
//   f04.time_interval = f08.time_interval
// ORDER BY 
//   f04.time_interval DESC


const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";

const queryClient = new AWS.TimestreamQuery();

async function fetchDataFromTimestream(date: string,plant_id: string) {

  const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  console.log("configMap --->",configMap)
  
  const timestream_table= configMap.plants[plant_id].timestream_table;
  console.log("timestream_table--->",timestream_table);
  const timestream_database= configMap.plants[plant_id].timestream_database;
  console.log("timestream_table--->",timestream_database);


  




  let intervalExpression: string;
 // Determine the interval expression based on the interval provided
  // switch (interval) {
  //   case "week":
  //     intervalExpression = "7d";
  //     break;
  //   case "month":
  //     intervalExpression = "30d";
  //     break;
  //   case "year":
  //     intervalExpression = "365d";
  //     break;
  //   case "day":
  //     intervalExpression = "1d";
  //     break;
  //   case "current":
  //     intervalExpression = "0m";
  //     break;
  //   default:
  //     throw new Error("Invalid interval");
  // }

   // Log the interval expression for debugging
  //  console.log(`Interval Expression:---------- ${intervalExpression}`);



  //  let timeSelected;

  // if (intervalExpression === "1d") {
  //   timeSelected = 10;
  // } else if (intervalExpression === "7d") {
  //   timeSelected = 360;
  // } else if (intervalExpression === "30d") {
  //   timeSelected = 1440;
  // } else if (intervalExpression === "365d") {
  //   timeSelected = 43800;
  // } else {
  //   timeSelected = 1;
  // }

  // console.log("timeSelected --------------", timeSelected);
   // ================================START_ QUERY FUNCTIONS  ================================

 

   
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





  // ================================END_ QUERY FUNCTIONS  ================================

  //  ===================START- TANK LEVEL HISTORY=================
  //  ===================START- TANK LEVEL HISTORY =================



  
//   `WITH FlowX08 AS (
//     SELECT 
//         bin(time, 10m) AS time_interval,
//         AVG(Flow_Lpmin) AS avgFlowLpminX08
//     FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
//     WHERE date_trunc('day', time) = '${date}' 
//           AND port = 'x08'
//     GROUP BY bin(time, 10m)
// ),

// FlowX04 AS (
//     SELECT 
//         bin(time, 10m) AS time_interval,
//         AVG(Flow_Lpmin) AS avgFlowLpminX04
//     FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
//     WHERE date_trunc('day', time) = '${date}' 
//           AND port = 'x04'
//     GROUP BY bin(time, 10m)
// ),

// CurrentTankLevels AS (
//     SELECT 
//         f04.time_interval,
//         CASE 
//             WHEN COALESCE(f08.avgFlowLpminX08, 0) > 1 THEN 9000 - f04.avgFlowLpminX04 + COALESCE(f08.avgFlowLpminX08, 0)
//             ELSE 9000 - f04.avgFlowLpminX04
//         END AS currentTankLevel
//     FROM 
//         FlowX04 f04
//     LEFT JOIN 
//         FlowX08 f08
//     ON 
//         f04.time_interval = f08.time_interval
// ),

// TenMinIntervals AS (
//     SELECT 
//         time_interval,
//         currentTankLevel
        
//     FROM 
//         CurrentTankLevels
//     GROUP BY 
//         time_interval
// ),

// SelectedHourIntervals AS (
//     SELECT 
//         bin(time_interval, 1d) AS time_interval,
//         AVG(currentTankLevel) AS currentTankLevel
//     FROM 
//         TenMinIntervals
//     GROUP BY 
//         bin(time_interval, 1d)
// )

// SELECT 
//     time_interval,
//     currentTankLevel

// FROM 
//     SelectedHourIntervals
// WHERE 
//     time_interval = '${date}' 
// ORDER BY 
//     time_interval DESC
// `;  







//   const queryStringTankLevelHistory =
//   `WITH FlowX08 AS (
//     SELECT 
//         bin(time, ${timeSelected}m) AS time_interval,
//         AVG(Flow_Lpmin) AS avgFlowLpminX08
//     FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
//     WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now()
//       AND port = 'x08'
//     GROUP BY bin(time, ${timeSelected}m)
// ),

// FlowX04 AS (
//     SELECT 
//         bin(time, ${timeSelected}m) AS time_interval,
//         AVG(Flow_Lpmin) AS avgFlowLpminX04
//     FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
//     WHERE time BETWEEN ago(${intervalExpression} + 10m) AND now()
//       AND port = 'x04'
//     GROUP BY bin(time, ${timeSelected}m)
// )

// SELECT 
//     f04.time_interval,
//     CASE 
//         WHEN COALESCE(f08.avgFlowLpminX08, 0) > 1 THEN 9000 - f04.avgFlowLpminX04 + COALESCE(f08.avgFlowLpminX08, 0)
//         ELSE 9000 - f04.avgFlowLpminX04
//     END AS currentTankLevel
// FROM 
//     FlowX04 f04
// LEFT JOIN 
//     FlowX08 f08
// ON 
//     f04.time_interval = f08.time_interval
// ORDER BY 
//     f04.time_interval DESC
// `;  



//==================DAY VISE TANK LEVEL DATA HISTORY


// PREVIOUS QUERY  FOR TANK LEVEL USING TOTILIZER X04 AND X08 
// PREVIOUS QUERY  FOR TANK LEVEL USING TOTILIZER X04 AND X08 

// const queryStringTankLevelHistory = `WITH FlowX08 AS (
//   SELECT 
//       bin(date_add('hour', 1, time), 10m) AS time_interval,
//       AVG(Flow_Lpmin) AS avgFlowLpminX08
//   FROM "${timestream_database}"."${timestream_table}"
//   WHERE date_trunc('day', time) = '${date}'  
//     AND port = 'x08'
//   GROUP BY bin(date_add('hour', 1, time), 10m)
// ),

// FlowX04 AS (
//   SELECT 
//       bin(date_add('hour', 1, time), 10m) AS time_interval,
//       AVG(Flow_Lpmin) AS avgFlowLpminX04
//   FROM "${timestream_database}"."${timestream_table}"
//   WHERE  date_trunc('day', time) = '${date}' 
//     AND port = 'x04'
//   GROUP BY bin(date_add('hour', 1, time), 10m)
// )

// SELECT 
//   f04.time_interval,
//   CASE 
//       WHEN COALESCE(f08.avgFlowLpminX08, 0) > 1 THEN 9000 - f04.avgFlowLpminX04 + COALESCE(f08.avgFlowLpminX08, 0)
//       ELSE 9000 - f04.avgFlowLpminX04
//   END AS currentTankLevel
// FROM 
//   FlowX04 f04
// LEFT JOIN 
//   FlowX08 f08
// ON 
//   f04.time_interval = f08.time_interval
// ORDER BY 
//   f04.time_interval DESC
// `;


// NEW QUERY  FOR TANK LEVEL USING TOTILIZER X04 AND X08 
// NEW QUERY  FOR TANK LEVEL USING TOTILIZER X04 AND X08 





const queryStringTankLevelHistory =
`WITH FlowX04 AS (
  WITH date_series AS (
    SELECT bin(date_add('hour', 1, time), 10m) AS time_interval
    FROM "${timestream_database}"."${timestream_table}"
    WHERE date_trunc('day', time) = '${date}'
    GROUP BY bin(date_add('hour', 1, time), 10m)
  ),
  binned_data AS (
    SELECT 
        bin(date_add('hour', 1, time), 10m) AS time_interval,
        MAX(Totaliser1_m3) AS Totaliser1_m3
    FROM "${timestream_database}"."${timestream_table}"
    WHERE date_trunc('day', time) = '${date}'
      AND port = 'x04'
    GROUP BY bin(date_add('hour', 1, time), 10m)
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
      COALESCE(
        LAST_VALUE(CASE WHEN COALESCE(bd.Totaliser1_m3, 0) > 0 THEN COALESCE(bd.Totaliser1_m3, 0) END)
        IGNORE NULLS 
        OVER (ORDER BY ds.time_interval ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
        1 
      ) AS last_non_zero_value
    FROM date_series ds
    LEFT JOIN binned_data bd ON ds.time_interval = bd.time_interval
  )
  SELECT
    time_interval,
    CASE 
      WHEN Totaliser1_m3 = 0 AND prev_value = 0 THEN 0 
      WHEN Totaliser1_m3 = 0 AND prev_value != 0 AND next_value != 0 THEN next_value - prev_value 
      WHEN Totaliser1_m3 != 0 AND prev_value = 0 AND next_value != 0 AND prev_prev_value != 0 THEN Totaliser1_m3 - prev_prev_value 
      WHEN Totaliser1_m3 != 0 AND prev_value = 0 THEN Totaliser1_m3 - last_non_zero_value 
      ELSE Totaliser1_m3 - prev_value
    END AS Flow_Lpmin
  FROM data_with_lag
),

FlowX08 AS (
  WITH date_series AS (
    SELECT bin(date_add('hour', 1, time), 10m) AS time_interval
    FROM "${timestream_database}"."${timestream_table}"
    WHERE date_trunc('day', time) = '${date}'
    GROUP BY bin(date_add('hour', 1, time), 10m)
  ),
  binned_data AS (
    SELECT 
        bin(date_add('hour', 1, time), 10m) AS time_interval,
        MAX(Totaliser1_m3) AS Totaliser1_m3
    FROM "${timestream_database}"."${timestream_table}"
    WHERE date_trunc('day', time) = '${date}'
      AND port = 'x08'
    GROUP BY bin(date_add('hour', 1, time), 10m)
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
      COALESCE(
        LAST_VALUE(CASE WHEN COALESCE(bd.Totaliser1_m3, 0) > 0 THEN COALESCE(bd.Totaliser1_m3, 0) END)
        IGNORE NULLS 
        OVER (ORDER BY ds.time_interval ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW),
        1 
      ) AS last_non_zero_value
    FROM date_series ds
    LEFT JOIN binned_data bd ON ds.time_interval = bd.time_interval
  )
  SELECT
    time_interval,
    CASE 
      WHEN Totaliser1_m3 = 0 AND prev_value = 0 THEN 0 
      WHEN Totaliser1_m3 = 0 AND prev_value != 0 AND next_value != 0 THEN next_value - prev_value 
      WHEN Totaliser1_m3 != 0 AND prev_value = 0 AND next_value != 0 AND prev_prev_value != 0 THEN Totaliser1_m3 - prev_prev_value 
      WHEN Totaliser1_m3 != 0 AND prev_value = 0 THEN Totaliser1_m3 - last_non_zero_value 
      ELSE Totaliser1_m3 - prev_value
    END AS Flow_Lpmin
  FROM data_with_lag
),

TankLevel AS (
  SELECT
    bin(date_add('hour', 1, time), 10m) AS time_interval,
    AVG(Flow_Lpmin) AS Tank_level
  FROM
    "${timestream_database}"."${timestream_table}"
  WHERE date_trunc('day', time) = '${date}'
    AND port = 'mo1'
  GROUP BY
    bin(date_add('hour', 1, time), 10m)
)

SELECT
  COALESCE(f04.time_interval, f08.time_interval) AS time_interval,
  CASE 
    WHEN COALESCE(tl.Tank_level, 0) > 0 THEN (
      SELECT AVG(Tank_level) 
      FROM TankLevel
    )
    ELSE (
      CASE 
        WHEN COALESCE(f08.Flow_Lpmin, 0) > 1 THEN 9000 - COALESCE(f04.Flow_Lpmin, 0) + COALESCE(f08.Flow_Lpmin, 0)
        ELSE 9000 - COALESCE(f04.Flow_Lpmin, 0)
      END
    )
  END AS currentTankLevel
FROM 
  FlowX04 f04
LEFT JOIN 
  FlowX08 f08 ON f04.time_interval = f08.time_interval
LEFT JOIN 
  TankLevel tl ON f04.time_interval = tl.time_interval
ORDER BY 
  time_interval DESC
`



  //  ===================END- TANK LEVEL HISTORY =================
  //  ===================END- TANK LEVEL HISTORY =================



  


  try {

    


    const StringTankLevelHistory = await queryDatabase1(
      queryStringTankLevelHistory
    );
  

    

    console.log(
      "StringTankLevelHistory --------------",
      StringTankLevelHistory
    );

   



     return StringTankLevelHistory;

  } catch (error) {
    console.log("DATA ERROR----------", error);
  }
  //  =====================================================
}

export const handler = async (event: any) => {
  console.log("Event:-----", event);
  // const interval = event?.interval || "day";
  // console.log("Interval:----------", interval);

  const date = event?.date || "2024-07-01";
  console.log("date:----------", date);

  const plant_id = event?.plant_id || null;
  console.log("plant_id:----------", plant_id);

  try {
    const data = await fetchDataFromTimestream(date,plant_id);
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
