import boto3
from botocore.exceptions import ClientError

s3 = boto3.client('s3')

def upload_file(file, bucket, object_name):
    try:
        s3.upload_fileobj(file, bucket, object_name)
        return f"https://{bucket}.s3.amazonaws.com/{object_name}"
    except ClientError as e:
        return None
