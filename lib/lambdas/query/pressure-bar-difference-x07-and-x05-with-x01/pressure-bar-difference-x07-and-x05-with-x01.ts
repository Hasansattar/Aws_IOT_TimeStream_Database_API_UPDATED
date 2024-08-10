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
import {config} from '../../../config/config';



export interface  QueryPressureBarDifferenceX07AndX05WithX01LambdaProps  {
  config: any; // You can replace 'any' with a more specific type if you have one
}


export class QueryPressureBarDifferenceX07AndX05WithX01Lambda extends Construct {
  constructor(scope: Construct, id: string, api: GraphQLApi, db: TimestreamDatabase, role: LambdaRole,props:QueryPressureBarDifferenceX07AndX05WithX01LambdaProps) {
    super(scope, id);
    const config = props.config;
    const configMappingString = JSON.stringify(config.lambdaMappings)
    // const configJsonlambdaMappings = JSON.parse(configMappingString)
    

    const queryPressureBarDifferenceX07AndX05WithX01Lambda = new lambda.Function(this, `${config.stage}-QueryPressureBarDifferenceX07AndX05WithX01Lambda`, {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lib/lambdas/query/pressure-bar-difference-x07-and-x05-with-x01/asset"),
      environment: {
        TS_DATABASE_NAME: db.timeStreamDB,
        TS_TABLE_NAME: db.tableName,
        APPSYNC_API_ID: api.graphQLApi.apiId,
        APPSYNC_API_KEY: api.graphQLApi.apiKey!,
        TO_EMAIL_ADDRESS: config.emailAddress,
        CONFIG_MAPPING_STRING:configMappingString
  
      },
  
      role: role.lambdaRole,
      timeout: cdk.Duration.minutes(5),
    });
  
    // AppSync Data Source
    const lambdaDsPressureBarDifferenceX07AndX05WithX01 = api.graphQLApi.addLambdaDataSource(
      "queryPressureBarDifferenceX07AndX05WithX01LambdaDatasource",
      queryPressureBarDifferenceX07AndX05WithX01Lambda
    );
     
      // Resolver for Query Data
      lambdaDsPressureBarDifferenceX07AndX05WithX01.createResolver("createResolvergetPressureBarDifferenceX07AndX05WithX01LambdaData", {
      typeName: "Query",
      fieldName: "getPressureDifferenceWithPortx07Andx05Withx01",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
          {
            "version": "2018-05-29",
            "operation": "Invoke",
            "payload": {
                "interval": "$ctx.args.interval",
                 "limit": "$ctx.args.limit",
                  "port": "$ctx.args.port",
                  "plant_id": "$ctx.args.plant_id"
              }
           
          
          
          }
      `),
  
      responseMappingTemplate: appsync.MappingTemplate.fromString(
        `#if($ctx.error)
          $util.error($ctx.error.message, $ctx.error.type)
         #else
              $utils.toJson($ctx.result)  
         #end`
  ),
    });

    queryPressureBarDifferenceX07AndX05WithX01Lambda.addPermission("EventBridgeInvoke", {
      principal: new iam.ServicePrincipal("events.amazonaws.com"),
      sourceArn: `arn:aws:events:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:rule/*`,
    });
  
    // EventBridge Rule to trigger the Lambda function periodically
    new events.Rule(this, "rulequeryPressureBarDifferenceX07AndX05WithX01Lambda", {
      schedule: events.Schedule.rate(cdk.Duration.minutes(11)),
      targets: [new targets.LambdaFunction(queryPressureBarDifferenceX07AndX05WithX01Lambda)],
    });
    

  }
}
