import {Stack, StackProps, RemovalPolicy, Duration, Tags} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket, BlockPublicAccess, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {BackupPlan, BackupPlanRule, BackupResource} from 'aws-cdk-lib/aws-backup';
import {Role, ServicePrincipal, Policy, PolicyStatement, Effect} from 'aws-cdk-lib/aws-iam';
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
            objectOwnership: ObjectOwnership.BUCKET_OWNER_PREFERRED,
            removalPolicy: RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });

		const snapShotSchedule = new BackupPlanRule({
			deleteAfter: Duration.days(7),
			ruleName: 'daily-example-backup-7days-ret',
			scheduleExpression: Schedule.cron({
				month: '*',
				day: '*',
				hour: '21',
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
					continuousSchedule,
				],
			}
		);

		const backupPlanSnapshot = new BackupPlan(
			this,
			's3-backup-plan-snapshot',
			{
				backupPlanName: 's3-backup-snapshot',
				backupPlanRules: [
					snapShotSchedule
				]
			}
		);

		const backupPlanRole = new Role(this, 's3-example-bucket-backup-role', {
            assumedBy: new ServicePrincipal('backup.amazonaws.com'),
        });

        const awsS3BackupsCustomPolicy = new Policy(this, 's3-custom-aws-backup-policy', {
            statements: [
                new PolicyStatement({
                    sid: 'S3BucketBackupPermissions',
                    actions: [
                        's3:GetInventoryConfiguration',
                        's3:PutInventoryConfiguration',
                        's3:ListBucketVersions',
                        's3:ListBucket',
                        's3:GetBucketVersioning',
                        's3:GetBucketNotification',
                        's3:PutBucketNotification',
                        's3:GetBucketLocation',
                        's3:GetBucketTagging',
                    ],
                    effect: Effect.ALLOW,
                    resources: [bucket.bucketArn],
                }),
                new PolicyStatement({
                    sid: 'S3ObjectBackupPermissions',
                    actions: [
                        's3:GetObjectAcl',
                        's3:GetObject',
                        's3:GetObjectVersionTagging',
                        's3:GetObjectVersionAcl',
                        's3:GetObjectTagging',
                        's3:GetObjectVersion',
                    ],
                    effect: Effect.ALLOW,
                    resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
                }),
                new PolicyStatement({
                    sid: 'S3GlobalPermissions',
                    actions: ['s3:ListAllMyBuckets'],
                    effect: Effect.ALLOW,
                    resources: ['*'],
                }),
                new PolicyStatement({
                    sid: 'KMSBackupPermissions',
                    actions: ['kms:Decrypt', 'kms:DescribeKey'],
                    effect: Effect.ALLOW,
                    resources: ['*'],
                    conditions: {
                        StringLike: {
                            'kms:ViaService': 's3.*.amazonaws.com',
                        },
                    },
                }),
                new PolicyStatement({
                    sid: 'EventsPermissions',
                    actions: [
                        'events:DescribeRule',
                        'events:EnableRule',
                        'events:PutRule',
                        'events:DeleteRule',
                        'events:PutTargets',
                        'events:RemoveTargets',
                        'events:ListTargetsByRule',
                        'events:DisableRule',
                    ],
                    effect: Effect.ALLOW,
                    resources: ['arn:aws:events:*:*:rule/AwsBackupManagedRule*'],
                }),
                new PolicyStatement({
                    sid: 'EventsMetricsGlobalPermissions',
                    actions: ['cloudwatch:GetMetricData', 'events:ListRules'],
                    effect: Effect.ALLOW,
                    resources: ['*'],
                }),
            ],
        });

        awsS3BackupsCustomPolicy.attachToRole(backupPlanRole);

        const awsS3BackupsCustomRestorePolicy = new Policy(this, 's3-custom-aws-backup-restore-policy', {
            statements: [
                new PolicyStatement({
                    sid: 'S3BucketRestorePermissions',
                    actions: [
                        's3:CreateBucket',
                        's3:ListBucketVersions',
                        's3:ListBucket',
                        's3:GetBucketVersioning',
                        's3:GetBucketLocation',
                        's3:PutBucketVersioning',
                    ],
                    effect: Effect.ALLOW,
                    resources: [bucket.bucketArn],
                }),
                new PolicyStatement({
                    sid: 'S3ObjectRestorePermissions',
                    actions: [
                        's3:GetObject',
                        's3:GetObjectVersion',
                        's3:DeleteObject',
                        's3:PutObjectVersionAcl',
                        's3:GetObjectVersionAcl',
                        's3:GetObjectTagging',
                        's3:PutObjectTagging',
                        's3:GetObjectAcl',
                        's3:PutObjectAcl',
                        's3:PutObject',
                        's3:ListMultipartUploadParts',
                    ],
                    effect: Effect.ALLOW,
                    resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
                }),
                new PolicyStatement({
                    sid: 'KMSBackupPermissions',
                    actions: ['kms:Decrypt', 'kms:DescribeKey', 'kms:GenerateDataKey'],
                    effect: Effect.ALLOW,
                    resources: ['*'],
                    conditions: {
                        StringLike: {
                            'kms:ViaService': 's3.*.amazonaws.com',
                        },
                    },
                }),
            ],
        });

        awsS3BackupsCustomRestorePolicy.attachToRole(backupPlanRole);

		backupPlan.addSelection(
			's3-example-bucket',
			{
				resources: [
					BackupResource.fromArn(bucket.bucketArn)
				],
				allowRestores: true,
				backupSelectionName: 's3-example-image-bucket-backup',
				role: backupPlanRole
			}
		);

        backupPlanSnapshot.addSelection(
			's3-example-bucket-snapshot',
			{
				resources: [
					BackupResource.fromArn(bucket.bucketArn)
				],
				allowRestores: true,
				backupSelectionName: 's3-example-bucket-only-snapshot-v2',
                role: backupPlanRole
			}
		);
    }
}
