import {Stack, StackProps, RemovalPolicy, Duration, Tags} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket, BlockPublicAccess, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {BackupPlan, BackupPlanRule, BackupResource} from 'aws-cdk-lib/aws-backup';
import {} from 'aws-cdk-lib/aws-iam';
import {Schedule} from 'aws-cdk-lib/aws-events';

type BlogS3BackupInfrastructureProperties = {
    bucketName: string;
} & StackProps;

export class BlogS3BackupInfrastructure extends Stack {
    constructor(scope: Construct, id: string, props: BlogS3BackupInfrastructureProperties) {
        super(scope, id, props);

        const {bucketName} = props;

        const bucket = new Bucket(this, 'aws-blog-bucket-example', {
            bucketName,
            versioned: true,
            enforceSSL: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

		Tags.of(bucket).add('backup', 'true');

		const snapShotSchedule = new BackupPlanRule({
			deleteAfter: Duration.days(7),
			ruleName: 'daily-example-backup-7days-ret',
			scheduleExpression: Schedule.cron({
				month: '*',
				day: '*',
				hour: '5',
				minute: '0'
			})
		});

		const continuousSchedule = new BackupPlanRule({
			enableContinuousBackup: true,
			ruleName: 'pitr-s3',
			scheduleExpression: Schedule.cron({
				month: '*',
				day: '*',
				hour: '*',
				minute: '0'
			})
		});

        const backupPlan = new BackupPlan(
			this,
			's3-backup-plan',
			{
				backupPlanName: 's3-backup-plan',
				backupPlanRules: [
					snapShotSchedule,
					continuousSchedule,
				],
			}
		);

		backupPlan.addSelection(
			's3-example-bucket',
			{
				resources: [
					BackupResource.fromArn(bucket.bucketArn)
				],
				allowRestores: true,
				backupSelectionName: 's3-example-bucket-only',
			}
		)
    }
}
