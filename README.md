# AWS Backup for S3 examples for Cloudway blog post

## Copy example files to S3

Run `npx zx ./scripts/copy-to-s3.mjs`

## Deploy the stack

- Navigate to `./infrastructure`
- Create a `config.json` file with a `bucketName` property

```json
{
	"bucketName": "my-test-bucket-1"
}
```

- Run `npm install`
- Make sure your AWS credentials are configured
- Run `npm run deploy`
  
This will deploy this stack to your AWS account

## AWS Resource Inventory

- 1 S3 Bucket
- 1 IAM role
- 2 AWS Backup vaults
- 2 AWS Backup plans

## Delete the resources

- Delete the Cloudformation stack from the AWS console or run `npm run cdk destroy` to remove the stack and delete all the resources.
