const AWS = require("aws-sdk");
import { APIGatewayProxyHandler } from "aws-lambda";
// import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
// import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
//import * as AWS from "aws-sdk";

const dynamodb = new AWS.DynamoDB.DocumentClient();

const queryClient = new AWS.TimestreamQuery();
const ses = new AWS.SES();


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

// async function storeStatusInDynamoDB(plant_id, status_identifier, statusbar_result) {
//   const tableName = process.env.STATUS_CHECK_TABLE_NAME; // Ensure your environment variable is set
  
//   const params = {
//       TableName: tableName,
//       Item: {
//           plant_id: plant_id,
//           status_identifier: status_identifier,
//           status: statusbar_result,
         
//       }
//   };

//   try {
//       await dynamodb.put(params).promise();
//       console.log("Status stored in DynamoDB successfully");
//   } catch (error) {
//       console.error("Error storing status in DynamoDB:", error);
//   }
// }

// async function isAlertStatusAlreadyRed(plantId: string, statusIdentifier: string): Promise<boolean> {
//     const params = {
//         TableName: `AlertMgmt-${config.stage}`,
//         Key: marshall({
//             plant_id: plantId,
//             status_identifier: statusIdentifier
//         })
//     };

//     try {
//         const { Item } = await dynamodb. send(new GetItemCommand(params));
//         if (!Item) {
//             return false;
//         }

//         const item = unmarshall(Item);
//         return item.status === "RED";
//     } catch (error) {
//         console.error(error);
//         return false;
//     }
// }








// async function updateAlertStatus(plantId: string, statusIdentifier: string, newStatus: string): Promise<boolean> {
//   const params = {
//       TableName: "AlertMgmt-dev",
//       Key: marshall({
//           plant_id: plantId,
//           status_identifier: statusIdentifier
//       }),
//       UpdateExpression: "set #s = :val",
//       ExpressionAttributeNames: {
//           "#s": "status"
//       },
//       ExpressionAttributeValues: marshall({
//           ":val": newStatus
//       }),
//       ReturnValues: "UPDATED_NEW"
//   };

//   try {
//       const { Attributes } = await client.send(new UpdateItemCommand(params));
//       if (!Attributes) {
//           return false;
//       }

//       const updatedAttributes = unmarshall(Attributes);
//       return updatedAttributes.status === newStatus;
//   } catch (error) {
//       console.error(error);
//       return false;
//   }
// }






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

  //  ===================START- CURRENT VALUES OF X08 AND X04 FLOW_Lpmings =================
  //  ===================START- CURRENT VALUES OF X08 AND X04 FLOW_Lpmings =================

  const currentValueX08Flowlpmin = `SELECT Flow_Lpmin 
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(10m) AND now()
  AND port = 'x08'
  ORDER BY time DESC
  LIMIT 1`;



  const currentValueX04Flowlpmin = `SELECT Flow_Lpmin 
  FROM "${timestream_database}"."${timestream_table}"
  WHERE time BETWEEN ago(10m) AND now()
  AND port = 'x04'
  ORDER BY time DESC
  LIMIT 1`;




  
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
              Text: { Data: `Alert! The X04 water is more then x08 : status is ${statusbar_result}` },
            },
            Subject: { Data: "X04 > X08 Water Alert" },
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

  //  ===================END- CURRENT VALUES OF X08 AND X04 FLOW_Lpmings =================
  //  ===================END- CURRENT VALUES OF X08 AND X04 FLOW_Lpmings =================

  try {
    // =================================================================
    const StringCurrentValueX08Flowlpmin = await queryDatabase(
      currentValueX08Flowlpmin
    );

    const StringCurrentValueX04Flowlpmin = await queryDatabase(
      currentValueX04Flowlpmin
    );

    const x08Production = StringCurrentValueX08Flowlpmin;

    const x04Distribution = StringCurrentValueX04Flowlpmin;

    let Status_Alert;

    const statusbar_result = x04Distribution > x08Production ? "RED" : "GREEN";

    if (statusbar_result === "RED") {

      //const AlertStatusAlreadyRed= await isAlertStatusAlreadyRed(plant_id,"waterproduction")
      //const AlertStatusAlreadyRed =   await addTodo(plant_ids,"waterproduction",statusbar_result)
      //const  AlertStatusAlreadyRed = await storeStatusInDynamoDB(plant_ids, "waterproduction", statusbar_result);
      const  AlertStatusAlreadyRed = await  isAlertStatusAlreadyRed(plant_ids, "waterproduction");
      console.log("AlertStatusAlreadyRed",AlertStatusAlreadyRed.status);
       const AlertStatus=AlertStatusAlreadyRed.status

      
     
      if ( AlertStatus != statusbar_result){
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
            await sendEmail(statusbar_result, destination_email);
        }


      const  updateAlertStatusAlreadyRed = await updateAlertStatus(plant_ids,"waterproduction",statusbar_result)
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed);
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed.status);
        

// updateAlertStatus(plant_id,"waterproduction",statusbar_result).then(statusUpdated => {
//   console.log(statusUpdated);
// });


      }

     


      //await sendEmail(statusbar_result,formattedArrayEmail);
    }
    else{
      const  updateAlertStatusAlreadyRed = await updateAlertStatus(plant_ids,"waterproduction",statusbar_result)
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed);
      console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed.status);

      // updateAlertStatus(plant_id,"waterproduction",statusbar_result).then(statusUpdated => {
      //   console.log(statusUpdated);
      // });
      
    }

    const data = {
      x04_distribution_water: x04Distribution,
      x08_production_water: x08Production,
      status_alert: statusbar_result,
    };

    console.log("data--------", data);

    return data;
  } catch (error) {
    console.log("DATA ERROR----------", error);
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
