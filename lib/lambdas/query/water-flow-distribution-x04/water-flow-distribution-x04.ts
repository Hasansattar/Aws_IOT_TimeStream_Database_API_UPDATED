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
// import {config} from '../../config/config';

export interface  QueryWaterFlowDistributionx04LambdaProps  {
  config: any; // You can replace 'any' with a more specific type if you have one
}


export class QueryWaterFlowDistributionx04Lambda extends Construct {
  constructor(scope: Construct, id: string, api: GraphQLApi, db: TimestreamDatabase, role: LambdaRole,props:QueryWaterFlowDistributionx04LambdaProps) {
    super(scope, id);

    const config = props.config;

    const configMappingString = JSON.stringify(config.lambdaMappings)
    // const configJsonlambdaMappings = JSON.parse(configMappingString)


 
    const queryWaterFlowDistributionx04Lambda = new lambda.Function(this, `${config.stage}-QueryWaterFlowDistributionx04Lambda`, {
      runtime: lambda.Runtime.NODEJS_16_X,
      handler: "handler.handler",
      code: lambda.Code.fromAsset("lib/lambdas/query/water-flow-distribution-x04/asset"),
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
    const lambdaDsqueryWaterFlowDistributionx04Lambda = api.graphQLApi.addLambdaDataSource(
      "queryWaterDistributionAndProduction3LambdaDatasource",
      queryWaterFlowDistributionx04Lambda
    );
     
      // Resolver for Query Data
      lambdaDsqueryWaterFlowDistributionx04Lambda.createResolver("createResolvergetWaterFlowDistributionx04Data", {
      typeName: "Query",
      fieldName: "getWaterFlowDistributionX04",
      requestMappingTemplate: appsync.MappingTemplate.fromString(`
          {
            "version": "2018-05-29",
            "operation": "Invoke",
             "payload": {
              "interval": "$ctx.args.interval",
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

   
     
     

  }
}
