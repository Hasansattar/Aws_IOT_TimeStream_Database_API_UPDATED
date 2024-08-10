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
// ========================UPDATE STATUS ALERT========================


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

async function fetchDataFromTimestream(plant_id: string) {

  const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  console.log("configMap --->",configMap)
  const plant_ids= configMap.plants[plant_id].plant_id;
  const timestream_table= configMap.plants[plant_id].timestream_table;
  console.log("timestream_table--->",timestream_table);
  const timestream_database= configMap.plants[plant_id].timestream_database;
  console.log("timestream_table--->",timestream_database);



  const queryStringX04 = `
     SELECT Flow_Lpmin AS avg_Flow_Lpmin 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(10m) and now() AND port='x04' AND Flow_Lpmin > 0
     ORDER BY time DESC
     LIMIT 1
     `;

  const queryStringX08 = `
     SELECT Flow_Lpmin AS avg_Flow_Lpmin 
     FROM "${timestream_database}"."${timestream_table}"
     WHERE time between ago(10m) and now() AND port='x08' AND Flow_Lpmin > 0
     ORDER BY time DESC
     LIMIT 1
   `;



   const queryStringCurrentWithOutFlow_LpminLessthen0X08 = `
   SELECT Flow_Lpmin AS avg_Flow_Lpmin 
   FROM "${timestream_database}"."${timestream_table}"
   WHERE time between ago(10m) and now() AND port='x08' 
   ORDER BY time DESC
   LIMIT 1
 `;

 // =================================================START- SES _SEND MESSAGE TO SES================================================================

 const sendEmail = async (statusbar_result:any,destination_email:any) => {
         console.log(" Destination Email list----->",destination_email);
          const d_mails = JSON.stringify(destination_email);
        //  const s_mails = JSON.stringify(source_email);
         console.log(" Destination Email list----->", d_mails);
         //console.log(" Source Email----->", s_mails);
         const destination_emails = JSON.parse(d_mails);
        // const Source_email = JSON.parse(s_mails);
  const params = {
    Destination: {
      ToAddresses: [destination_emails],
    },
    Message: {
      Body: {
        Text: { Data: `Alert! The Current operation status is ${statusbar_result}` },
      },
      Subject: { Data: "Operation Alert" },
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

// =================================================END- SES _SEND MESSAGE TO SES================================================================


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

  try {

   


    // Querying the data
    const avgFlowLpminX04 = await queryDatabase(queryStringX04);
    const avgFlowLpminX08 = await queryDatabase(queryStringX08);
    const StringCurrentWithOutFlow_LpminLessthen0X08 = await queryDatabase(queryStringCurrentWithOutFlow_LpminLessthen0X08);
    
    console.log("avgFlowLpminX04--------------", avgFlowLpminX04);
    console.log("avgFlowLpminX08--------------", avgFlowLpminX08);
    console.log("CurrentWithOutFlow_LpminLessthen0X08--------------", StringCurrentWithOutFlow_LpminLessthen0X08);
   
    // Calculating tank level
    
    // If water tank level is less than 60% and Flow_Lpmin is Null then Alert

    let currentTankLevel = 9000 - avgFlowLpminX04 + avgFlowLpminX08;
    let     x08LpminEqualToZero = StringCurrentWithOutFlow_LpminLessthen0X08;
    console.log("x08LpminEqualToZero ---> ",x08LpminEqualToZero);
    console.log("avgFlowLpminX08 ---> ",avgFlowLpminX08);
    let currentTankLevel_Status="RED"; 
    const currentStatusTankLevel = currentTankLevel <= 5400 || x08LpminEqualToZero == null || x08LpminEqualToZero == 0 ? currentTankLevel_Status : "GREEN";
    

    if (currentStatusTankLevel === "RED" ) {
      const  AlertStatusAlreadyRed = await  isAlertStatusAlreadyRed(plant_ids, "operation");
      console.log("AlertStatusAlreadyRed",AlertStatusAlreadyRed.status);
      const AlertStatus=AlertStatusAlreadyRed.status

      if(AlertStatus != currentStatusTankLevel){
        const email=await fetchEmailFromDynamoDB();
       
      const emailArray= email[0].split(',');
      const quotedEmails = emailArray.map(email => `"${email}"`);
      // Convert array to string without single quotes around the array
      const formattedArrayEmail = `[${quotedEmails.join(", ")}]`;

      

      const emailArrayLoop = JSON.parse(formattedArrayEmail);

     
         
      for (let i = 0; i < emailArrayLoop.length; i++) {
          const destination_email = emailArrayLoop[i];
         // const source_email = emailArrayLoop[0];
                                       
          console.log("destination_email --->",destination_email)
          //console.log("source_email --->",source_email)
          await sendEmail(currentStatusTankLevel, destination_email);
      }
      const  updateAlertStatusAlreadyRed = await updateAlertStatus(plant_ids,"operation",currentStatusTankLevel)
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed);
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed.status);




      }
    

      // await sendEmail(currentStatusTankLevel,formattedArrayEmail);
    }
    else{
      const  updateAlertStatusAlreadyRed = await updateAlertStatus(plant_ids,"operation",currentStatusTankLevel)
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
      Flow_Lpmin_x08:StringCurrentWithOutFlow_LpminLessthen0X08
     
    };

    console.log("data--------", data);

    console.log("Current Tank Level:", currentTankLevel);
    console.log("Current Tank Level Status:", currentStatusTankLevel);
  

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
    const data = await fetchDataFromTimestream(plant_id);
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
