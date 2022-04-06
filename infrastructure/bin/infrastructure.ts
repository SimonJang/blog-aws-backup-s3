#!/usr/bin/env node
import 'source-map-support/register';
import ow from 'ow';
import * as cdk from 'aws-cdk-lib';
import {BlogS3BackupInfrastructure} from '../lib/infrastructure-stack';

type Config = {
	bucketName: string;
}

const config = require('../config.json');

const app = new cdk.App();

try {
	ow(config, ow.object.exactShape({
		bucketName: ow.string.nonEmpty
	}));
} catch (err) {
	console.error(err);
	throw err;
}

new BlogS3BackupInfrastructure(app, 'BlogS3BackupInfrastructure', {
	bucketName: config.bucketName
});
