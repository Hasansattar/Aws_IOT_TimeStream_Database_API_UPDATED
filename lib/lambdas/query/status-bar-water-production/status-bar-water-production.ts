import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as iam from "aws-cdk-lib/aws-iam";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";

import { GraphQLApi } from '../../../graphql-api';
import { TimestreamDatabase } from '../../../database';
import { LambdaRole } from '../../../roles';
import {DynamoDatabase} from '../../../dynamodb'
import {DynamoDatabaseStatusCheck} from '../../../dynamodbForStatusCheck'
// import {config} from '../../config/config';


export interface  QueryStatusBarWaterProductionLambdaProps  {
  config: any; // You can replace 'any' with a more specific type if you have one
}


export class QueryStatusBarWaterProductionLambda extends Construct {
  constructor(scope: Construct, id: string, api: GraphQLApi,dynamostatuscheck:DynamoDatabaseStatusCheck, dynamo:DynamoDatabase, db: TimestreamDatabase, role: LambdaRole,props:QueryStatusBarWaterProductionLambdaProps) {
    super(scope, id);

    const config = props.config;
    const configMappingString = JSON.stringify(config.lambdaMappings)
    // const configJsonlambdaMappings = JSON.parse(configMappingString)
        
    const queryStatusBarWaterProductionLambda = new lambda.Function(this, `${config.stage}-QueryStatusBarWaterProductionLambda`, {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lib/lambdas/query/status-bar-water-production/asset"),
      environment: {
        TABLE_NAME: dynamo.DynamoTable.tableName,
        STATUS_CHECK_TABLE_NAME:dynamostatuscheck.DynamoTable.tableName,
        TS_DATABASE_NAME: db.timeStreamDB,
        TS_TABLE_NAME: db.tableName,
        APPSYNC_API_ID: api.graphQLApi.apiId,
        APPSYNC_API_KEY:api. graphQLApi.apiKey!,
        TO_EMAIL_ADDRESS: config.emailAddress,
        CONFIG_MAPPING_STRING:configMappingString,
        STAGE: config.stage
        
      },
  
      role: role.lambdaRole,
      timeout: cdk.Duration.minutes(5),
    });

    // Add IAM policy to allow DynamoDB PutItem, GetItem, and UpdateItem actions
    // queryStatusBarWaterProductionLambda.addToRolePolicy(new iam.PolicyStatement({
    //   actions: ['dynamodb:PutItem', 'dynamodb:GetItem', 'dynamodb:UpdateItem'],
    //   resources: [dynamostatuscheck.DynamoTable.tableArn,],
    // }));
  

    dynamo.DynamoTable.grantReadData(queryStatusBarWaterProductionLambda);
    dynamostatuscheck.DynamoTable.grantFullAccess(queryStatusBarWaterProductionLambda); // Grant permission to write to DynamoDB
    // dynamostatuscheck.DynamoTable.grantReadData(queryStatusBarWaterProductionLambda);
    // dynamostatuscheck.DynamoTable.grantReadWriteData(queryStatusBarWaterProductionLambda);

    // AppSync Data Source
    const lambdaDsStatusBarWaterProduction = api.graphQLApi.addLambdaDataSource(
      "querylambdaDsStatusBarWaterProductionOperation",
      queryStatusBarWaterProductionLambda
    );
     
      // Resolver for Query Data
      lambdaDsStatusBarWaterProduction.createResolver("createResolvergetStatusBarWaterProductionLambdaData", {
      typeName: "Query",
      fieldName: "getStatusBarWaterProduction",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
          {
            "version": "2018-05-29",
            "operation": "Invoke",
             "payload": {
                  "plant_id": "$ctx.args.plant_id"
              }
          
          
          }
      `),
  
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `#if($ctx.error)
          $util.error($ctx.error.message, $ctx.error.type)
         #else
              {
              "x04_distribution_water": "$ctx.result.x04_distribution_water",  
              "x08_production_water": "$ctx.result.x08_production_water",  
              "status_alert": "$ctx.result.status_alert"  
              }
         #end`
  ),
    });


    queryStatusBarWaterProductionLambda.addPermission("EventBridgeInvoke", {
      principal: new iam.ServicePrincipal("events.amazonaws.com"),
      sourceArn: `arn:aws:events:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:rule/*`,
    });
  
    // EventBridge Rule to trigger the Lambda function periodically
    new events.Rule(this, "rulequeryStatusBarWaterProductionLambda", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(11)),
      targets: [new targets.LambdaFunction(queryStatusBarWaterProductionLambda)],
    });
     

  }
}
