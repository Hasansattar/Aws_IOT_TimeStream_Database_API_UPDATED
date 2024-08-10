const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";
import { DateTime } from 'luxon';
import {v4 as uuidv4}  from "uuid"

const dynamodb = new AWS.DynamoDB.DocumentClient();

//const { DateTime } = require('luxon');
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










// ==================================CURRENT CET TIMES =================================================

// Function to get the current time and one hour and twenty minutes before, both rounded down to the nearest 10-minute interval
function getTenMinuteIntervals() {
  const nowCET = DateTime.now().setZone('CET'); // Change 'CET' to your desired timezone
  const oneHourTwentyMinutesAgo = nowCET.minus({ hours: 1, minutes: 8 , seconds: 10  });
  const minutesOneHourTwentyMinutesAgo = Math.floor(oneHourTwentyMinutesAgo.minute / 10) * 10;
  const roundedTimeOneHourTwentyMinutesAgo = oneHourTwentyMinutesAgo.set({ minute: minutesOneHourTwentyMinutesAgo, second: 0, millisecond: 0 });
  const  time= roundedTimeOneHourTwentyMinutesAgo.toFormat("yyyy-MM-dd HH:mm:00.000000000");

  return time;

}

const times = getTenMinuteIntervals();
console.log("One hour and twenty minutes before 10-minute interval:", times);
const time=times;


// ==================================CURRENT CET TIMES =================================================



// ==================================24 hoours ago CET TIMES =================================================


function getTweentyFourHoursAgoIntervals() {
  const nowCET = DateTime.now().setZone('CET'); // Change 'CET' to your desired timezone
  const TwentyFourHoursAgo = nowCET.minus({ hours: 25, minutes: 8 , seconds: 10  });
  const hoursTwentyFoursHoursAgo = Math.floor(TwentyFourHoursAgo.minute / 10) * 10;
  const roundedTimeTwentyFoutHoursAgo = TwentyFourHoursAgo.set({ minute: hoursTwentyFoursHoursAgo, second: 0, millisecond: 0 });
  const  TweentyFourAgotime= roundedTimeTwentyFoutHoursAgo.toFormat("yyyy-MM-dd HH:mm:00.000000000");
  return TweentyFourAgotime;

}

const times24hourago = getTweentyFourHoursAgoIntervals();
console.log("One hour and twenty minutes before 10-minute interval:", times24hourago);
const time24hourago=times24hourago;

const custom24HoursTime=JSON.stringify(time24hourago);
    console.log("customTime -------->",custom24HoursTime);

    let formattedDate24HpursAgoTime = custom24HoursTime.replace(/\\/g, "").replace(/"/g, "");
    console.log("formattedDate24HpursAgoTime",formattedDate24HpursAgoTime);
// ==================================24 hoours ago CET TIMES =================================================




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
LIMIT ${limit}

`


      

  try {

    const WaterFlowLpminHistoryWater= await queryDatabase1(
      queryStringHistoryOfWaterflow
    );
  console.log("WaterFlowLpminHistoryWater",WaterFlowLpminHistoryWater[0].time_interval);
  console.log("WaterFlowLpminHistoryWater-time",time);

    
    
    const WaterFlowLpminHistoryWaterTotilizer= await queryDatabase1(
      queryStringHistoryOfWaterflowTotilizer
    );


    

    const TimesteamTime= JSON.stringify(WaterFlowLpminHistoryWater[0].time_interval);
    const customTime=JSON.stringify(time);
    console.log("customTime -------->",customTime);
    console.log("TimesteamTime ------>",TimesteamTime);


    // Remove extra backslashes
     let formattedDateTime = customTime.replace(/\\/g, "").replace(/"/g, "");
     console.log(formattedDateTime); 



    //  let dataArray:any[]=[];
    // const pushDefaultData = () => {
    
    //   const defaultData = {
    //     "time_interval": formattedDateTime,
    //     "Flow_Lpmin": "0"
    //   };
    
    //   dataArray.push(defaultData);
    //   console.log("Default data pushed:", defaultData);

    // };

    
// Function to push default data to DynamoDB
const pushDefaultData = async () => {
  
  const defaultData = {
      "id": uuidv4(),
      "time_interval": formattedDateTime,
      "Flow_Lpmin": "0",
      "set_identifier":"water-distribution-and-production" ,
      
  };

  // Store the defaultData in DynamoDB
  const params = {
      TableName: process.env.DB_STOP_MACHINE_HISTORY,
      Item: defaultData,
      
  };

  try {
      await dynamodb.put(params).promise();
      console.log("Default data pushed to DynamoDB:", defaultData);
  } catch (error) {
      console.error("Error pushing data to DynamoDB:", error);
  }
};


// ========================ChECK STATUS ALERT======================== 
 const getDefaultData= async(setIdentifier:string)=> {
  console.log('Getting status from DynamoDB for:', {  setIdentifier });
  const params = {
    TableName: process.env.DB_STOP_MACHINE_HISTORY,
     FilterExpression: 'set_identifier = :setIdentifier',
        ExpressionAttributeValues: {
':setIdentifier': setIdentifier
     }
};
  // Log the parameters being sent to DynamoDB
  console.log('DynamoDB Scan Parameters:', JSON.stringify(params));
  try {
    const result = await dynamodb.scan(params).promise();
    console.log('Raw result from DynamoDB:', JSON.stringify(result));

    if (result.Items && result.Items.length > 0) {
        console.log('Status retrieved successfully from DynamoDB:', result.Items);
        return result.Items; // Return the array of items
    
  } else {
    console.log('No items found with the specified set_identifier.');
    return []; // Return an empty array if no items are found
}
  
}catch (error) {
    console.error('Error retrieving status from DynamoDB:', error);
    throw new Error('Error retrieving status from DynamoDB');
  }
}




const deleteOldData = async (setIdentifier: string) => {
  // Get the current time
  const tweenTyFourHourAgo = new Date(formattedDate24HpursAgoTime);
  

  // Scan the DynamoDB table for items with the specified set_identifier
  const params = {
      TableName: process.env.DB_STOP_MACHINE_HISTORY,
      FilterExpression: 'set_identifier = :setIdentifier',
      ExpressionAttributeValues: {
          ':setIdentifier': setIdentifier,
      },
  };

  try {
      const result = await dynamodb.scan(params).promise();
      const itemsToDelete = result.Items?.filter(item => {
          // Convert the time_interval string to a DateTime object
          const itemTime = new Date(item.time_interval);
          return itemTime < tweenTyFourHourAgo; // Filter items older than 24 hours
      });

      console.log("item to delete",itemsToDelete);


      console.log(`Found ${itemsToDelete.length} items older than 24 hours to delete.`);

      // Delete each item that is older than 24 hours
      const deletePromises = itemsToDelete.map(item => {
          const deleteParams = {
              TableName: process.env.DB_STOP_MACHINE_HISTORY,
              Key: {
                  id: item.id, // Assuming 'id' is the primary key
                  set_identifier:"water-distribution-and-production"

              },
          };
          return dynamodb.delete(deleteParams).promise();
      });

      await Promise.all(deletePromises);
      console.log(`Deleted ${deletePromises.length} items from DynamoDB.`);
  } catch (error) {
      console.error("Error scanning or deleting items from DynamoDB:", error);
  }
};














let dataArray:any[] = [];


const DefaultData = async() => {
    await pushDefaultData();
    const data= await getDefaultData("water-distribution-and-production");
    

    const tweenTyFourHourAgo = new Date(formattedDate24HpursAgoTime);
    const itemsToDelete = data?.filter(item => {
      // Convert the time_interval string to a DateTime object
      const itemTime = new Date(item.time_interval);
      console.log("itemTime --->",itemTime)
      return itemTime < tweenTyFourHourAgo; // Filter items older than 24 hours
  });

   console.log("itemsToDeleteitemsToDeleteitemsToDelete",itemsToDelete)
  if(itemsToDelete){
    await deleteOldData("water-distribution-and-production")

  }

    const customData = data.map(item => ({
      time_interval: item.time_interval,
      Flow_Lpmin: item.Flow_Lpmin
    }));
    console.log("customData---->",...customData);
  

    // if(customData.)

  
  // Append the defaultData to the end of the dataArray
  dataArray.push(...customData);
  console.log("Default data pushed:", ...customData);
  WaterFlowLpminHistoryWater.push(...dataArray);
};


    // Check the WaterFlowLpminHistoryWater condition
   if (TimesteamTime != customTime) {
  // Initial push
    await DefaultData();


     
    setInterval(async() => {
      // Push default data for the current 10-minute bin
      await DefaultData();
      WaterFlowLpminHistoryWater.push(...dataArray); // Append dataArray to the end of WaterFlowLpminHistoryWater
  }, 600000); // 600000 ms = 10 minutes
      
    
   
}

console.log("dataArray--- >",dataArray);
   
  const newDefaultData=WaterFlowLpminHistoryWater.unshift(...dataArray);


  console.log("newDefaultData",newDefaultData);




    if(interval=="day" && TimesteamTime === customTime){
      const data = WaterFlowLpminHistoryWater;
      console.log("data--------", data);
      return data;
      
    }
    if(TimesteamTime != customTime){
      console.log("newDefaultData",newDefaultData);
      const data = WaterFlowLpminHistoryWater;
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
