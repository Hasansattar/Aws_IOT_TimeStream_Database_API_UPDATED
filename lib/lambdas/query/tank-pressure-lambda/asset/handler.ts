const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";

const queryClient = new AWS.TimestreamQuery();

async function fetchDataFromTimestream(interval: string,plant_id:string) {


  const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  console.log("configMap --->",configMap)
  
  const timestream_table= configMap.plants[plant_id].timestream_table;
  console.log("timestream_table--->",timestream_table);
  const get_plant_id= configMap.plants[plant_id].plant_id;
  console.log("plant_id--->",get_plant_id);
  const max_tank_level= configMap.plants[plant_id].max_tank_level;
  console.log("max_tank_level--->",max_tank_level);
  const plant_name= configMap.plants[plant_id].plant_name;
  console.log("plant_name--->",plant_name);
  const timestream_database= configMap.plants[plant_id].timestream_database;
  console.log("timestream_table--->",timestream_database);



  


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

  //==========================================================


   

   // PREVIOUS QUERY WITHOUT USE TOTLIZER

  const queryStringX04 = `
     SELECT Flow_Lpmin AS avg_Flow_Lpmin 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(${intervalExpression} + 10m ) and ago(${intervalExpression} ) AND port='x04' AND Flow_Lpmin > 1
     ORDER BY time DESC
     LIMIT 1
     `;
   

     // NEW QUERY FOR X04 WITH USE TOTLIZER

     const queryStringX04withTotilier=
     `
WITH date_series AS (
  SELECT bin(date_add('hour', 1, time), 10m) AS time_interval
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(${intervalExpression} + 20m ) and ago(${intervalExpression} )
  GROUP BY bin(date_add('hour', 1, time), 10m)
),
binned_data AS (
  SELECT 
      bin(date_add('hour', 1, time), 10m) AS time_interval,
      MAX(Totaliser1_m3) AS Totaliser1_m3
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(${intervalExpression} + 20m ) and ago(${intervalExpression} )
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
  Totaliser1_m3,
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
  END AS central_difference
FROM data_with_lag
ORDER BY time_interval DESC
     
     `

 
   


    // PREVIOUS QUERY FOR X08 WITH USE TOTLIZER
  const queryStringX08 = `
     SELECT Flow_Lpmin AS avg_Flow_Lpmin 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(${intervalExpression} + 10m) and ago(${intervalExpression}) AND port='x08' AND Flow_Lpmin > 1
     ORDER BY time DESC
     LIMIT 1
   `;


   // NEW QUERY FOR X08 WITH USE TOTLIZER

   const queryStringX08withTotilier=
     `
WITH date_series AS (
  SELECT bin(date_add('hour', 1, time), 10m) AS time_interval
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(${intervalExpression} + 20m ) and ago(${intervalExpression} )
  GROUP BY bin(date_add('hour', 1, time), 10m)
),
binned_data AS (
  SELECT 
      bin(date_add('hour', 1, time), 10m) AS time_interval,
      MAX(Totaliser1_m3) AS Totaliser1_m3
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(${intervalExpression} + 20m ) and ago(${intervalExpression} )
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
  Totaliser1_m3,
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
  END AS central_difference
FROM data_with_lag
ORDER BY time_interval DESC
     
     `
    




   const queryStringX08LessThen1 = `
   SELECT Flow_Lpmin
   FROM "${timestream_database}"."${timestream_table}"
   WHERE time between ago(${intervalExpression} + 10m) and ago(${intervalExpression}) AND port='x08'
   ORDER BY time DESC
   LIMIT 1
 `;

  const queryStringX05 = `
     SELECT Pressure_bar AS avg_Pressure_bar 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(${intervalExpression} + 10m) and ago(${intervalExpression}) AND port='x05' 
     ORDER BY time DESC
     LIMIT 1
   `;

  const queryStringX01 = `
     SELECT Pressure_bar AS avg_Pressure_bar 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(${intervalExpression} +10m) and ago(${intervalExpression}) AND port='x01' 
     ORDER BY time DESC
     LIMIT 1
   `;


  //  If x01 is equal to zero then get last know value of x01

//    const queryStringX01 =  `
// WITH latest_value AS (
//     SELECT Pressure_bar AS avg_Pressure_bar
//     FROM "${timestream_database}"."${process.env.TS_TABLE_NAME}"
//     WHERE time BETWEEN ago(${intervalExpression} + 10m) AND ago(${intervalExpression})
//       AND port = 'x01'
//     ORDER BY time DESC
//     LIMIT 1
// ),
// non_zero_values AS (
//     SELECT Pressure_bar AS avg_Pressure_bar
//     FROM "${timestream_database}"."${process.env.TS_TABLE_NAME}"
//     WHERE Pressure_bar != 0
//       AND port = 'x01'
//     ORDER BY time DESC
// )

// SELECT 
//     CASE
//         WHEN (SELECT avg_Pressure_bar FROM latest_value) = 0 
//         THEN (SELECT avg_Pressure_bar FROM non_zero_values LIMIT 1)
//         ELSE (SELECT avg_Pressure_bar FROM latest_value)
//     END AS avg_Pressure_bar
//     `






  const queryStringX07 = `
     SELECT Pressure_bar  AS avg_Pressure_bar 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(${intervalExpression} + 10m) and ago(${intervalExpression}) AND port='x07'
     ORDER BY time DESC
     LIMIT 1
   `;


  //  ====================STARTWATER PRODUCTIONTOTLIZER==============================
  
    const totalizerInterval = interval !== "current" ? intervalExpression : '1d';
     
  const queryStringTotilizerPreviosWaterflowX04 = `
  SELECT Totaliser1_m3 AS Totaliser1_L_x04_time
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(${totalizerInterval} + 10m) AND ago(${totalizerInterval})
  AND port = 'x04'
  ORDER BY time DESC
  LIMIT 1  
  `;

  // const queryStringTotilizerCurrentWaterflowx04 = `
  // SELECT Totaliser1_m3 AS Totaliser1_L_x04_Last10Minutes
  // FROM "${timestream_database}"."${timestream_table}"
  // WHERE time BETWEEN ago(10m) AND now()
  // AND port = 'x04'
  // ORDER BY time DESC
  // LIMIT 1
  // `;


//  if x04 distribution if Off or Null then get last know value of x04 distribution

 const queryStringTotilizerCurrentWaterflowx04 = `WITH latest_value AS (
    SELECT Totaliser1_m3 AS Totaliser1_L_x04_Last10Minutes
    FROM "${timestream_database}"."${timestream_table}"
    WHERE time BETWEEN ago(10m) AND now()
      AND port = 'x04'
    ORDER BY time DESC
    LIMIT 1
),
non_zero_non_null_values AS (
    SELECT Totaliser1_m3 AS Totaliser1_L_x04_Last10Minutes
    FROM "${timestream_database}"."${timestream_table}"
    WHERE Totaliser1_m3 IS NOT NULL
      AND Totaliser1_m3 != 0
      AND port = 'x04'
    ORDER BY time DESC
)

SELECT 
    CASE
        WHEN (SELECT Totaliser1_L_x04_Last10Minutes FROM latest_value) IS NULL 
          OR (SELECT Totaliser1_L_x04_Last10Minutes FROM latest_value) = 0 
        THEN (SELECT Totaliser1_L_x04_Last10Minutes FROM non_zero_non_null_values LIMIT 1)
        ELSE (SELECT Totaliser1_L_x04_Last10Minutes FROM latest_value)
    END AS Totaliser1_L_x04_Last10Minutes
 `










  const queryStringTotilizerPreviosWaterflowX08 = `
  SELECT Totaliser1_m3 AS Totaliser1_L_x08_time
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(${totalizerInterval} + 10m) AND ago(${totalizerInterval})
  AND port = 'x08'
  ORDER BY time DESC
  LIMIT 1  
  `;

  
  // const queryStringTotilizerCurrentWaterflowx08 = `
  // SELECT Totaliser1_m3 AS Totaliser1_L_x08_Last10Minutes
  // FROM "${process.env.TS_DATABASE_NAME}"."${timestream_table}"
  // WHERE time BETWEEN ago(10m) AND now()
  // AND port = 'x08'
  // ORDER BY time DESC
  // LIMIT 1
  // `;
  

  // if Produxtion is Off or NUll then get last know value of production

  const queryStringTotilizerCurrentWaterflowx08 = `WITH latest_value AS (
    SELECT Totaliser1_m3 AS Totaliser1_L_x08_Last10Minutes
    FROM "${timestream_database}"."${timestream_table}"
    WHERE time BETWEEN ago(10m) AND now()
      AND port = 'x08'
    ORDER BY time DESC
    LIMIT 1
),
non_zero_non_null_values AS (
    SELECT Totaliser1_m3 AS Totaliser1_L_x08_Last10Minutes
    FROM "${timestream_database}"."${timestream_table}"
    WHERE Totaliser1_m3 IS NOT NULL
      AND Totaliser1_m3 != 0
      AND port = 'x08'
    ORDER BY time DESC
)

SELECT 
    CASE
        WHEN (SELECT Totaliser1_L_x08_Last10Minutes FROM latest_value) IS NULL 
          OR (SELECT Totaliser1_L_x08_Last10Minutes FROM latest_value) = 0 
        THEN (SELECT Totaliser1_L_x08_Last10Minutes FROM non_zero_non_null_values LIMIT 1)
        ELSE (SELECT Totaliser1_L_x08_Last10Minutes FROM latest_value)
    END AS Totaliser1_L_x08_Last10Minutes
  `

// ======================END WATER PRODUCTION TOTILIZER==============================

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


  try {

    const StringTotilizerPreviosWaterflowX04 = await queryDatabase(queryStringTotilizerPreviosWaterflowX04);
    const StringTotilizerCurrentWaterflowx04 = await queryDatabase(queryStringTotilizerCurrentWaterflowx04);
    const StringTotilizerPreviosWaterflowX08 = await queryDatabase(queryStringTotilizerPreviosWaterflowX08);
    const StringTotilizerCurrentWaterflowx08 = await queryDatabase(queryStringTotilizerCurrentWaterflowx08);
   


    console.log("StringTotilizerPreviosWaterflowX04------",StringTotilizerPreviosWaterflowX04);


    // Querying the data
    const avgFlowLpminX04 = await queryDatabase(queryStringX04);
    const StringX04withTotilier = await queryDatabase1(queryStringX04withTotilier);
    
    const avgFlowLpminX08 = await queryDatabase(queryStringX08);
    const StringX08withTotilier = await queryDatabase1(queryStringX08withTotilier);

    const avgPressureBarX05 = await queryDatabase(queryStringX05);
    const avgPressureBarX01 = await queryDatabase(queryStringX01);
    const avgPressureBarX07 = await queryDatabase(queryStringX07);

    const StringX08LessThen1 = await queryDatabase(queryStringX08LessThen1);
    console.log("StringX08LessThen1--------------", StringX08LessThen1);

    console.log("avgFlowLpminX04--------------", avgFlowLpminX04);
    console.log("StringX04with-Totilier--------------", StringX04withTotilier);
    console.log("StringX04with-Totilier--------------", StringX04withTotilier[0].central_difference);

    console.log("avgFlowLpminX08--------------", avgFlowLpminX08);
    console.log("StringX08with-Totilier--------------", StringX08withTotilier);
    console.log("StringX08with-Totilier--------------", StringX08withTotilier[0].central_difference);
    console.log("avgPressureBarX05--------------", avgPressureBarX05);
    console.log("avgPressureBarX01--------------", avgPressureBarX01);
    console.log("avgPressureBarX07--------------", avgPressureBarX07);

    // Calculating tank level

      const x04TotilizerCentalDifference=StringX04withTotilier[0].central_difference
      const x08TotilizerCentalDifference=StringX08withTotilier[0].central_difference
      console.log("number-->",Number(x04TotilizerCentalDifference))

    // let currentTankLevel = 9000 - avgFlowLpminX04 + avgFlowLpminX08;

    // if (currentTankLevel == 9000) {
    //   // Tank is full
    //   let currentTankLevel = 9000 - avgFlowLpminX04;
    //   console.log("Tank is full", currentTankLevel);
    // } else if (avgFlowLpminX08 > 1) {
    //   // current Tank level , X08 turns on
    //   let currentTankLevel = 9000 - avgFlowLpminX04 + avgFlowLpminX08;
    //   console.log("Current Tank level , X08 turns on ", currentTankLevel);
    // } else {
    //   // Tank is full
    //   console.log("Tank is full", currentTankLevel);
    // }
   
    let currentTankLevel = 9000 - Number(x04TotilizerCentalDifference) + Number(x08TotilizerCentalDifference);
     console.log("Current--->",currentTankLevel);
    if (currentTankLevel == 9000) {
      // Tank is full
       currentTankLevel = 9000 - Number(x04TotilizerCentalDifference);
      console.log("Tank is full", currentTankLevel);
    } else if (avgFlowLpminX08 > 1) {
      // current Tank level , X08 turns on
       currentTankLevel = 9000 - Number(x04TotilizerCentalDifference) + Number(x08TotilizerCentalDifference);
      console.log("Current Tank level , X08 turns on ", currentTankLevel);
    } else {
      // Tank is full
      console.log("Tank is full", currentTankLevel);
    }




    // Calculating filter results
    const filter1Result = avgPressureBarX01 - avgPressureBarX05 ;
    const filter2Result = avgPressureBarX01 - avgPressureBarX07;

    console.log("filter1Result --------",filter1Result);
    console.log("filter2Result --------",filter2Result);



    const waterDistributedx04 = StringTotilizerCurrentWaterflowx04 - StringTotilizerPreviosWaterflowX04;
     
    console.log("waterProductionx04 --------",waterDistributedx04);
    
    const waterProducedx08 =StringTotilizerCurrentWaterflowx08 - StringTotilizerPreviosWaterflowX08;

    console.log("waterProductionx08 --------",waterProducedx08);

    

      const filter1ResultZero = StringX08LessThen1 < 0 ? 0 : filter1Result;
      const filter2ResultZero = StringX08LessThen1 < 0 ? 0 : filter2Result;

  

    // const filter1ResultZero = filter1Result <= 0 ? 0 : filter1Result;
    // const filter2ResultZero = filter2Result <= 0 ? 0 : filter2Result;
     
 
    const interval = intervalExpression;
    const data = {
      currentTankLevel: currentTankLevel,
      filter1Result: filter1ResultZero,
      filter2Result: filter2ResultZero,
      interval: interval, // Add interval to the data object
      distributedWaterx04: waterDistributedx04,
      producedWaterx08:waterProducedx08,
      plantID:get_plant_id,
      maxTankLevel:max_tank_level,
      plantName:plant_name
      
    };

    console.log("data--------", data);

    console.log("Current Tank Level:", currentTankLevel);
    console.log("Filter1 Result (x01 - x05 ):", filter1Result);
    console.log("Filter2 Result (x01 - x07):", filter2Result);

    return data;
  } catch (error) {
    console.log("hasansas", error);
  }
  //  =====================================================
}

export const handler = async (event: any) => {
  console.log("Event:-----", event);
  const interval = event?.interval || "week";
  console.log("Interval:----------", interval);
  const plant_id = event?.plant_id || null;
  console.log("plant_id:----------", plant_id);

  try {
    const data = await fetchDataFromTimestream(interval,plant_id);
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
