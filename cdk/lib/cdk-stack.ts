import * as cdk from "@aws-cdk/core";
import * as s3 from "@aws-cdk/aws-s3";
import * as kms from "@aws-cdk/aws-kms";

import { CONSTANTS } from "./constants";

export class CdkStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /**
     * Define server access log bucket
     */
    const serverAccessLogBucket = new s3.Bucket(
      this,
      CONSTANTS.serverAccessLogBucketName,
      {
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
      },
    );

    /**
     * (If you need to have the main bucket encrypted with kms)
     * Define Key to encrypt the main bucket.
     * The main bucket is often used as a log output destination for AWS services such as lambda and cloudwatch.
     * Therefore, you will create it as a CMK so that you can specify those services as principals in the key policy.
     */
    const bucketKey = new kms.Key(this, CONSTANTS.bucketKeyAlias, {
      // You don't need a description.
      description: "Key to encrypt the main bucket",
      alias: CONSTANTS.bucketKeyAlias,
      // Depending on your company's regulations and security policies, it may be safer to rotate them.
      enableKeyRotation: true,
    });

    /**
     * Define main bucket
     */
    new s3.Bucket(this, CONSTANTS.bucketName, {
      bucketName: CONSTANTS.bucketName,

      // Depending on your company's regulations and security policies,
      // It does not need to be encrypted, and the encryption method may be specified as server-side encryption.
      encryption: s3.BucketEncryption.KMS,
      bucketKeyEnabled: true,
      encryptionKey: bucketKey,

      // If you use it as a bucket for log output, you don't need to disclose it to the outside world.
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

      serverAccessLogsBucket: serverAccessLogBucket,
    });
  }
}
