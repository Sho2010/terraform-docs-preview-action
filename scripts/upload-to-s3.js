const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const fs = require('fs');
const path = require('path');

/**
 * Recursively find all PNG files in a directory
 */
function findPngFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      findPngFiles(filePath, fileList);
    } else if (path.extname(file).toLowerCase() === '.png') {
      fileList.push(filePath);
    }
  });

  return fileList;
}

/**
 * Upload files to S3 and generate presigned URLs
 */
async function uploadToS3() {
  // Required environment variables
  const bucket = process.env.BUCKET;
  const prefix = process.env.PREFIX;
  const expiresIn = parseInt(process.env.EXPIRES_IN || '3600', 10);
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const screenshotsDir = process.env.SCREENSHOTS_DIR || 'screenshots';
  const usePublicUrl = process.env.USE_PUBLIC_URL === 'true';
  const awsRegion = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

  // Validate required env vars
  if (!bucket) {
    console.error('Error: BUCKET environment variable is required');
    process.exit(1);
  }
  if (!prefix) {
    console.error('Error: PREFIX environment variable is required');
    process.exit(1);
  }
  if (!repository) {
    console.error('Error: GITHUB_REPOSITORY environment variable is required');
    process.exit(1);
  }
  if (!runId) {
    console.error('Error: GITHUB_RUN_ID environment variable is required');
    process.exit(1);
  }

  // Check if screenshots directory exists
  if (!fs.existsSync(screenshotsDir)) {
    console.error(`Error: Screenshots directory not found: ${screenshotsDir}`);
    process.exit(1);
  }

  // Initialize S3 client (uses AWS credentials from environment)
  const s3Client = new S3Client({});

  // Find all PNG files
  const pngFiles = findPngFiles(screenshotsDir);

  if (pngFiles.length === 0) {
    console.log('No PNG files found in screenshots directory');
    console.log('[]');
    return;
  }

  console.log(`Found ${pngFiles.length} PNG file(s) to upload`);

  const urls = [];

  // Upload each file and generate presigned URL
  for (const filePath of pngFiles) {
    try {
      // Calculate relative path from screenshots directory
      const relativePath = path.relative(screenshotsDir, filePath);

      // Generate S3 key
      const key = `${prefix}/${repository}/${runId}/${relativePath}`;

      // Read file content
      const fileContent = fs.readFileSync(filePath);

      // Upload to S3
      const uploadCommand = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: fileContent,
        ContentType: 'image/png'
      });

      await s3Client.send(uploadCommand);
      console.log(`✓ Uploaded: ${relativePath}`);

      // Generate URL based on mode
      let url;
      if (usePublicUrl) {
        // Generate public S3 URL (requires bucket policy for public read access)
        url = `https://${bucket}.s3.${awsRegion}.amazonaws.com/${key}`;
      } else {
        // Generate presigned URL for viewing (GetObject)
        const getCommand = new GetObjectCommand({
          Bucket: bucket,
          Key: key
        });

        url = await getSignedUrl(s3Client, getCommand, {
          expiresIn: expiresIn
        });
      }

      urls.push(url);

    } catch (error) {
      console.error(`✗ Failed to upload ${filePath}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  // Output URLs as JSON array (single line for GitHub Actions output)
  console.error(`\nGenerated ${usePublicUrl ? 'public' : 'presigned'} URLs:`);
  urls.forEach(url => console.error(`  ${url}`));
  console.log(JSON.stringify(urls));
}

uploadToS3().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
