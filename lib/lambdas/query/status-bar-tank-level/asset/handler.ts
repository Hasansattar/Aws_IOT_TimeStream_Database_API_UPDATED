const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";

const queryClient = new AWS.TimestreamQuery();
const ses = new AWS.SES();
const dynamodb = new AWS.DynamoDB.DocumentClient();

// ========================ChECK STATUS ALERT======================== 
async function isAlertStatusAlreadyRed(plant_id:string, status_identifier:string) {
  console.log('Getting status from DynamoDB for:', { plant_id, status_identifier });
  const params = {
    TableName: process.env.STATUS_CHECK_TABLE_NAME,
    Key: {
      plant_id: plant_id,
      status_identifier: status_identifier,
    },
  };
  
  try {
    const result = await dynamodb.get(params).promise();
    console.log('Status retrieved successfully from DynamoDB:', result.Item);
    return result.Item;
  } catch (error) {
    console.error('Error retrieving status from DynamoDB:', error);
    throw new Error('Error retrieving status from DynamoDB');
  }
}

// ========================ChECK STATUS ALERT======================== 

// ========================UPDATE STATUS ALERT========================
async function updateAlertStatus(plant_id, status_identifier, status) {
  const params = {
    TableName: process.env.STATUS_CHECK_TABLE_NAME,
    Key: {
      plant_id: plant_id,
      status_identifier: status_identifier,
    },
    UpdateExpression: 'set #status = :status, #timestamp = :timestamp',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#timestamp': 'timestamp'
    },
    ExpressionAttributeValues: {
      ':status': status,
      ':timestamp': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  };

  try {
    const result = await dynamodb.update(params).promise();
    console.log('Status updated successfully in DynamoDB:', result.Attributes);
    return result.Attributes;
  } catch (error) {
    console.error('Error updating status in DynamoDB:', error);
    throw new Error('Error updating status in DynamoDB');
  }
}

//===========================UPDATE STATUS ALERT =========================

async function fetchEmailFromDynamoDB(){
  const tableName = process.env.TABLE_NAME;
  const organizationIdToFind = 'idce343e93ceb2c'; // Replace with the organization ID you're looking for

  const params = {
    TableName: tableName,
    FilterExpression: 'organization_id = :organizationId',
    ExpressionAttributeValues: {
      ':organizationId': organizationIdToFind,
    },
  };
  try {
    const data = await dynamodb.scan(params).promise();
    const items = data.Items;
    console.log("item=====>",items)

    if (items.length > 0) {
        // Assuming your DynamoDB table structure, add type annotations for 'item'
        const emails = items.map((item: { mail_contact: string }) => item.mail_contact);
        return emails;
        // return {
      //   statusCode: 200,
      //   body: emails,
      // };
    } else {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Organization ID not found' }),
      };
    }
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Could not retrieve emails' }),
    };
  }

};

async function fetchDataFromTimestream(interval: string,plant_id:string) {

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






  const queryStringX04 = `
     SELECT Flow_Lpmin AS avg_Flow_Lpmin 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(10m) and now() AND port='x04' AND Flow_Lpmin > 1
     ORDER BY time DESC
     LIMIT 1
     `;


  // NEW QUERY FOR X04 WITH USE TOTLIZER

  const queryStringX04withTotilier=
  `
WITH date_series AS (
SELECT bin(date_add('hour', 1, time), 10m) AS time_interval
FROM "${timestream_database}"."${timestream_table}"
WHERE time BETWEEN ago(20m) and now()
GROUP BY bin(date_add('hour', 1, time), 10m)
),
binned_data AS (
SELECT 
   bin(date_add('hour', 1, time), 10m) AS time_interval,
   MAX(Totaliser1_m3) AS Totaliser1_m3
FROM "${timestream_database}"."${timestream_table}"
WHERE time BETWEEN ago(20m) and now()
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





  const queryStringX08 = `
     SELECT Flow_Lpmin AS avg_Flow_Lpmin 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(10m) and now() AND port='x08' AND Flow_Lpmin > 1
     ORDER BY time DESC
     LIMIT 1
   `;


   // NEW QUERY FOR X08 WITH USE TOTLIZER

  const queryStringX08withTotilier=
  `
WITH date_series AS (
SELECT bin(date_add('hour', 1, time), 10m) AS time_interval
FROM "${timestream_database}"."${timestream_table}"
WHERE time BETWEEN ago(20m) and now()
GROUP BY bin(date_add('hour', 1, time), 10m)
),
binned_data AS (
SELECT 
   bin(date_add('hour', 1, time), 10m) AS time_interval,
   MAX(Totaliser1_m3) AS Totaliser1_m3
FROM "${timestream_database}"."${timestream_table}"
WHERE time BETWEEN ago(20m) and now()
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


  
      // =================================================START- SES _SEND MESSAGE TO SES================================================================

      const sendEmail = async (statusbar_result: any,destination_email:any) => {
        console.log(" Destination Email list----->",destination_email);
          const d_mails = JSON.stringify(destination_email);
          // const s_mails = JSON.stringify(source_email);
         console.log(" Destination Email list----->", d_mails);
        //  console.log(" Source Email----->", s_mails);
         const destination_emails = JSON.parse(d_mails);
        //  const Source_email = JSON.parse(s_mails);

        const params = {
          Destination: {
            ToAddresses: [destination_emails],
          },
          Message: {
            Body: {
              Text: { Data: `Alert! The current level of  tank status is ${statusbar_result}` },
            },
            Subject: { Data: "Tank Level Alert" },
          },
          Source: "noreply@aquacontrol.ai",
        };
    
        try {
          await ses.sendEmail(params).promise();
          console.log("Email sent successfully");
        } catch (err) {
          console.log("Error sending email:", err);
        }
      };
    
      // 

  try {

   


    // Querying the data
    const avgFlowLpminX04 = await queryDatabase(queryStringX04);
    const avgFlowLpminX08 = await queryDatabase(queryStringX08);


    const x04TotilizerCentalDifference=await queryDatabase1(queryStringX04withTotilier);
    const x08TotilizerCentalDifference =await queryDatabase1(queryStringX08withTotilier);

    
    console.log("x04TotilizerCentalDifference--------------", x04TotilizerCentalDifference);
    console.log("x08TotilizerCentalDifference--------------", x08TotilizerCentalDifference);
    
    console.log("avgFlowLpminX04--------------", avgFlowLpminX04);
    console.log("avgFlowLpminX08--------------", avgFlowLpminX08);
   
    // Calculating tank level

    // let currentTankLevel = 9000 - avgFlowLpminX04 + avgFlowLpminX08;
    
    let currentTankLevel = 9000 - Number(x04TotilizerCentalDifference[0].central_difference) + Number(x08TotilizerCentalDifference[0].central_difference);
      console.log("currentTankLevel----->", currentTankLevel)
    
    let currentTankLevel_Status="RED"; 
    const currentStatusTankLevel = currentTankLevel <= 5400 ? currentTankLevel_Status : "GREEN";


    
    if (currentStatusTankLevel === "RED") {


      const  AlertStatusAlreadyRed = await  isAlertStatusAlreadyRed(plant_ids, "tankLevel");
      console.log("AlertStatusAlreadyRed",AlertStatusAlreadyRed.status);
       const AlertStatus=AlertStatusAlreadyRed.status

       if ( AlertStatus != currentStatusTankLevel){
        const email=await fetchEmailFromDynamoDB();
       console.log("email  ----> ",email);

       const emailArray= email[0].split(',');
      const quotedEmails = emailArray.map(email => `"${email}"`);
      // Convert array to string without single quotes around the array
      const formattedArrayEmail = `[${quotedEmails.join(", ")}]`;
        
      const emailArrayLoop = JSON.parse(formattedArrayEmail);

     
         
      for (let i = 0; i < emailArrayLoop.length; i++) {
          const destination_email = emailArrayLoop[i];
          // const source_email = emailArrayLoop[0];
                                       
          console.log("destination_email --->",destination_email)
          // console.log("source_email --->",source_email)
          await sendEmail(currentStatusTankLevel, destination_email);
      }
      const  updateAlertStatusAlreadyRed = await updateAlertStatus(plant_ids,"tankLevel",currentStatusTankLevel)
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed);
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed.status);

       }


      
        

      //await sendEmail(currentStatusTankLevel,formattedArrayEmail);
    }
    else{
      const  updateAlertStatusAlreadyRed = await updateAlertStatus(plant_ids,"tankLevel",currentStatusTankLevel)
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed);
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed.status);
    }
   

    if (currentTankLevel == 9000) {
      // Tank is full
      let currentTankLevel = 9000 - avgFlowLpminX04;  
      console.log("Tank is full", currentTankLevel);
    } else if (avgFlowLpminX08 > 1) {
      // current Tank level , X08 turns on
      let currentTankLevel = 9000 - avgFlowLpminX04 + avgFlowLpminX08;
      console.log("Current Tank level , X08 turns on ", currentTankLevel);

    }
    else {
      // Tank is full
      console.log("Tank is full", currentTankLevel);
    }

  
 
    
    const data = {
      current_Tank_Level: currentTankLevel,
      status_alert: currentStatusTankLevel,
     
    };

    console.log("data--------", data);

    console.log("Current Tank Level:", currentTankLevel);
    console.log("Current Tank Level Status:", currentStatusTankLevel);
  

    return data;
  } catch (error) {
    console.log("Error", error);
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
