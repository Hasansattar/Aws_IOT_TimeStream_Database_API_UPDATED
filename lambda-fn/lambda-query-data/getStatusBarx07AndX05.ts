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

async function fetchDataFromTimestream(
  port: string,
  plant_id: string
 
) {

  const configMap = JSON.parse(process.env.CONFIG_MAPPING_STRING);
  console.log("configMap --->",configMap)
  const plant_ids= configMap.plants[plant_id].plant_id;
  
  const timestream_table= configMap.plants[plant_id].timestream_table;
  console.log("timestream_table--->",timestream_table);
  const timestream_database= configMap.plants[plant_id].timestream_database;
  console.log("timestream_table--->",timestream_database);


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




//   let intervalExpression: string;
// // Determine the interval expression based on the interval provided
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
//     case "current":
//       intervalExpression = "0m";
//       break;
//   default:
//     throw new Error("Invalid interval");
// }



//  // Log the interval expression for debugging
//  console.log(`Interval Expression:---------- ${intervalExpression}`);


//  let timeSelected;

// if (intervalExpression === '1d'){
//   timeSelected=10;
// }
// else if (intervalExpression === '7d') {
//   timeSelected=360;
// }

// else if (intervalExpression === '30d') {
//   timeSelected=1440;
// }
// else if (intervalExpression === '365d') {
//   timeSelected=43800;
// }
// else{
//   timeSelected=1;
// }





// console.log("timeSelected --------------",timeSelected);




 



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
  


     // previous query pressure Bar difference but it do not show value when sensors if Off 
     // previous query pressure Bar difference but it do not show value when sensors if Off

    //  const queryStringPessureBarDifference = `
    //     WITH ${port}_data AS (
    //    SELECT bin(time, 10m) AS time_interval,
    //    AVG(Pressure_bar) AS ${port}_Pressure_bar
    //    FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
    //    WHERE time between ago(10m) and now() 
    //    AND port='${port}'
    //    GROUP BY bin(time, 10m)
    //    ),
    //    x01_data AS (
    //    SELECT bin(time, 10m) AS time_interval,
    //    AVG(Pressure_bar) AS X01_Pressure_bar
    //    FROM "${process.env.TS_DATABASE_NAME}"."${process.env.TS_TABLE_NAME}"
    //    WHERE time between ago(10m) and now() 
    //    AND port='x01'
    //    GROUP BY bin(time, 10m)
    //    )
    //    SELECT
    //    ${port}_data.time_interval AS time_interval,
    //    ${port}_data.${port}_Pressure_bar - x01_data.X01_Pressure_bar AS pressure_bar_difference
    //    FROM ${port}_data
    //    JOIN
    //    x01_data ON ${port}_data.time_interval = x01_data.time_interval
    //    ORDER BY ${port}_data.time_interval DESC
    //     `;



     // Current query pressure Bar difference but it shows value=0 when sensors if Off 
     // Current query pressure Bar difference but it shows value=0 when sensors if Off

     const queryStringPessureBarDifference = `
     WITH ${validPortValue}_data AS (
    SELECT bin(date_add('hour', 1, time), 10m) AS time_interval,
    AVG(Pressure_bar) AS ${port}_Pressure_bar
    FROM "${timestream_database}"."${timestream_table}"
    WHERE time between ago(10m) and now() 
    AND port='${validPortValue}'
    GROUP BY bin(date_add('hour', 1, time), 10m)
    ),
    x01_data AS (
    SELECT bin(date_add('hour', 1, time), 10m) AS time_interval,
    AVG(Pressure_bar) AS X01_Pressure_bar
    FROM "${timestream_database}"."${timestream_table}"
    WHERE time between ago(10m) and now() 
    AND port='x01'
    GROUP BY bin(date_add('hour', 1, time), 10m)
    )
    SELECT
    COALESCE(${validPortValue}_data.time_interval, x01_data.time_interval) AS time_interval,
    COALESCE(x01_data.X01_Pressure_bar, 0) - COALESCE(${validPortValue}_data.${validPortValue}_Pressure_bar, 0) AS  pressure_bar_difference
    FROM
    ${validPortValue}_data
    FULL OUTER JOIN
    x01_data ON ${validPortValue}_data.time_interval = x01_data.time_interval
    ORDER BY time_interval DESC
     `;




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
  


  

     


  }
  catch(err){

    console.log("Error querying Timestream:", err);
    
  }
      }

      // =================================================START- SES _SEND MESSAGE TO SES================================================================

      const sendEmail = async (statusbar_result: any,destination_email:any) => {
        console.log(" Destination Email list----->",destination_email);
          const d_mails = JSON.stringify(destination_email);
         // const s_mails = JSON.stringify(source_email);
         console.log(" Destination Email list----->", d_mails);
        // console.log(" Source Email----->", s_mails);
         const destination_emails = JSON.parse(d_mails);
        // const Source_email = JSON.parse(s_mails);
        const params = {
          Destination: {
            ToAddresses: [destination_emails],
          },
          Message: {
            Body: {
              Text: { Data: `Alert! The pressure bar difference status is ${statusbar_result}` },
            },
            Subject: { Data: "Pressure Bar Difference Alert" },
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

    try{
     
      const StringPessureBarDifferencePort = await queryDatabase(queryStringPessureBarDifference);

      console.log("StringPessureBarDifferencePort-----",StringPessureBarDifferencePort);
      const statusbar=StringPessureBarDifferencePort[0].pressure_bar_difference;

      const statusbar_result= statusbar >= 1 ? "RED" : "GREEN";


      if (statusbar_result === "RED") {
            
       const  AlertStatusAlreadyRed = await  isAlertStatusAlreadyRed(plant_ids, "x07Andx05DifferenceWithx01");
       console.log("AlertStatusAlreadyRed",AlertStatusAlreadyRed.status);
       const AlertStatus=AlertStatusAlreadyRed.status


        if(AlertStatus != statusbar_result){
          const email=await fetchEmailFromDynamoDB();
          console.log("email  ----> ",email);
   
          const emailArray= email[0].split(',');
          const quotedEmails = emailArray.map(email => `"${email}"`);
          // Convert array to string without single quotes around the array
          const formattedArrayEmail = `[${quotedEmails.join(", ")}]`;
           
          const emailArrayLoop = JSON.parse(formattedArrayEmail);
   
        
            
         for (let i = 0; i < emailArrayLoop.length; i++) {
             const destination_email = emailArrayLoop[i];
             //const source_email = emailArrayLoop[0];
                                          
             console.log("destination_email --->",destination_email)
             //console.log("source_email --->",source_email)
             await sendEmail(statusbar_result, destination_email);
         }
         const  updateAlertStatusAlreadyRed = await updateAlertStatus(plant_ids,"x07Andx05DifferenceWithx01",statusbar_result)
         console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed);
         console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed.status);
         

        }
       
       
      
      }
      else{
        const  updateAlertStatusAlreadyRed = await updateAlertStatus(plant_ids,"x07Andx05DifferenceWithx01",statusbar_result)
        console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed);
        console.log("UpdatedAlertStatus",updateAlertStatusAlreadyRed.status);
      }  




      const data={
             "time_interval":StringPessureBarDifferencePort[0].time_interval,
             "pressure_bar_difference":StringPessureBarDifferencePort[0].pressure_bar_difference,
             "status_alert":statusbar_result

           };

      return data;
    
    
    
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
    const data = await fetchDataFromTimestream(port,plant_id);
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
