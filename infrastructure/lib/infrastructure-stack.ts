import {Stack, StackProps, RemovalPolicy, Duration, Tags} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Bucket, BlockPublicAccess, ObjectOwnership} from 'aws-cdk-lib/aws-s3';
import {BackupPlan, BackupResource, BackupPlanRule} from 'aws-cdk-lib/aws-backup';

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

        const continuousBackupPlan = BackupPlan.daily35DayRetention(this, 'continous-example-backup-plan');

        continuousBackupPlan.addSelection('s3-bucket-selection-continuous', {
            resources: [BackupResource.fromTag('backup', 'true')],
			allowRestores: true,
        });

        const snapshotBackupPlan = new BackupPlan(this, 'snapshot-example-backup-plan');

        snapshotBackupPlan.addSelection('s3-bucket-selection-snapshot', {
            resources: [BackupResource.fromTag('backup', 'true')],
			allowRestores: true
        });

        snapshotBackupPlan.addRule(
            new BackupPlanRule({
                completionWindow: Duration.hours(12),
                deleteAfter: Duration.days(3),
                ruleName: 'daily-example-backup-7days-ret',
                startWindow: Duration.hours(1),
            }),
        );
    }
}
