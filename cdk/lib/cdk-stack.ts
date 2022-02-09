import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import { CONSTANTS } from "./constants";

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Server Access Log Bucket
    new s3.Bucket(this, CONSTANTS.serverAccessLogBucketName, {
      bucketName: CONSTANTS.serverAccessLogBucketName,
      // NOTE: Server access log bucket does not support KMS encryption, so S3_MANAGED(Server-side encryption) must be specified.
      encryption: s3.BucketEncryption.S3_MANAGED,
      // Server access log bucket does not need to be disclosed externally.
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      // This lifecycle rule is the following.
      // 1. Garbage files from incomplete multipart uploads will be deleted after 60 days.
      // 2. After 60 days, transit from standard class to IA class.
      // 3. After 90 days, transit from IA class to Glacier Flexible Retrieval.
      // 4. After 180 days, transit from glacier to deep achive glacier.
      // 5. After 360 days, the object will be deleted.
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(60),
          transitions: [
            {
              storageClass: s3.StorageClass.INFREQUENT_ACCESS,
              transitionAfter: cdk.Duration.days(60),
            },
            {
              storageClass: s3.StorageClass.GLACIER,
              transitionAfter: cdk.Duration.days(90),
            },
            {
              storageClass: s3.StorageClass.DEEP_ARCHIVE,
              transitionAfter: cdk.Duration.days(180),
            },
          ],
          expiration: cdk.Duration.days(365),
        },
      ],
    });
  }
}
