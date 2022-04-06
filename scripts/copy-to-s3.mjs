const { join, basename } = require('path');

const { bucketName } = require('../infrastructure/config.json');

const users = [
	'user1',
	'user2'
];

const files = [
	join(__dirname, '../assets/img1.png'),
	join(__dirname, '../assets/img2.png'),
]

for (const user of users) {
	for (const file of files) {
		await $`aws s3 cp ${file} s3://${bucketName}/${user}/${basename(file)}`
	}
}