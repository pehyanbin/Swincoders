import json
import boto3
import logging
import os
from botocore.exceptions import ClientError
from datetime import datetime

logger = logging.getLogger()
logger.setLevel(logging.INFO)

bedrock = boto3.client('bedrock-runtime', region_name='us-east-1')
dynamodb = boto3.resource('dynamodb', region_name='ap-southeast-5') 
ses = boto3.client('ses', region_name='ap-southeast-1')

# Configuration

SENDER_EMAIL = 'j23040799@student.newinti.edu.my'
TABLE_NAME = 'employee'

def lambda_handler(event, context):
    logger.info("Event received: " + json.dumps(event))
    
    # Get employeeID from event
    employee_id = event.get('employeeID')
    if not employee_id:
        return {
            'statusCode': 400,
            'body': json.dumps('Missing employeeId')
        }

    # Fetch employee from DynamoDB
    table = dynamodb.Table(TABLE_NAME)
    try:
        response = table.get_item(Key={'employeeID': employee_id})
        if 'Item' not in response:
            return {
                'statusCode': 404,
                'body': json.dumps(f'Employee {employee_id} not found')
            }
        employee = response['Item']
        email = employee.get('email')
        
        if not email:
            return {
                'statusCode': 400,
                'body': json.dumps('Employee email missing')
            }
        skill_gaps = employee.get('skillGaps', [])
    except ClientError as e:
        logger.error("DynamoDB error: " + str(e))
        return {
            'statusCode': 500,
            'body': json.dumps('Database error')
        }

    # Determine topic
    topic = skill_gaps[0] if skill_gaps else "Productivity Tips"
    lesson = None

    # S3 BLOCK REMOVED — always generate with Bedrock now

    # Generate lesson using Bedrock
    prompt = f"""
    You are a friendly corporate trainer.
    Create a 5-minute micro-lesson on '{topic}' for a busy professional.
    Include:
    - Simple definition
    - One real-world example
    - One practical tip they can use today
    Keep it under 200 words. No markdown. No bullet points. Just plain, clear, friendly text 
    and use emoji's to make the text look friendly. 
    """

    # Model selection logic
    friendly_name_to_model_id = {
        "DeepSeek-R1": "us.deepseek.r1-v1:0",
        "Llama 4 Maverick 17B Instruct": "us.meta.llama4-maverick-17b-instruct-v1:0",
        "Llama 4 Scout 17B Instruct": "us.meta.llama4-scout-17b-instruct-v1:0",
    }

    requested_model_id = (event.get('modelId') if isinstance(event, dict) else None) or os.getenv('MODEL_ID')
    requested_model_name = (event.get('modelName') if isinstance(event, dict) else None) or os.getenv('MODEL_NAME')
    requested_profile_arn = (event.get('inferenceProfileArn') if isinstance(event, dict) else None) or os.getenv('INFERENCE_PROFILE_ARN')

    model_id = (
        requested_model_id
        or friendly_name_to_model_id.get(requested_model_name or "", None)
        or "us.meta.llama4-maverick-17b-instruct-v1:0"
    )

    inference_profile_arn = requested_profile_arn
    if not inference_profile_arn and isinstance(model_id, str) and model_id.startswith('arn:aws:bedrock:') and ':inference-profile/' in model_id:
        inference_profile_arn = model_id
        model_id = None

    try:
        # Use Bedrock Converse API
        converse_kwargs = {
            "messages": [{
                "role": "user",
                "content": [{"text": prompt}]
            }],
            "inferenceConfig": {
                "maxTokens": 400,
                "temperature": 0.7,
            }
        }
        if inference_profile_arn:
            converse_kwargs["inferenceProfileArn"] = inference_profile_arn
        else:
            converse_kwargs["modelId"] = model_id

        response = bedrock.converse(**converse_kwargs)

        # Parse AI-generated text
        ai_text = ""
        try:
            ai_text = response.get('output', {})\
                .get('message', {})\
                .get('content', [{}])[0]\
                .get('text', "").strip()
        except Exception:
            ai_text = ""

        # Fallback parsing (for older-style responses)
        if not ai_text:
            raw_body = response.get('body') if isinstance(response, dict) else None
            if raw_body:
                try:
                    response_body = json.loads(raw_body.read()) if hasattr(raw_body, 'read') else json.loads(raw_body)
                    ai_text = (
                        response_body.get('content', [{}])[0].get('text')
                        or response_body.get('generation')
                        or response_body.get('output_text')
                        or response_body.get('text')
                        or ""
                    ).strip()
                except Exception:
                    pass

        # Build lesson object
        lesson = {
            'title': f"Learn: {topic}",
            'duration': "5 min",
            'content': ai_text
        }
        which_route = inference_profile_arn if inference_profile_arn else model_id
        logger.info(f"Generated lesson using: {which_route}")

    except Exception as be:
        which_route = inference_profile_arn if inference_profile_arn else model_id
        logger.error(f"Bedrock generation failed for {which_route}: {be}")
        return {
            'statusCode': 500,
            'body': json.dumps(f'AI generation failed: {str(be)}')
        }

    # Prepare email
    subject = f"📚 Daily Micro-Lesson: {lesson['title']}"
    processed_content = lesson['content'].replace('\n', '<br>')
    current_date = datetime.now().strftime('%B %d, %Y')

    body_html = """
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <div style="background: #f0f7ff; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #2c5282; margin: 0;">{title}</h2>
            <p><strong>⏱️ Duration:</strong> {duration}</p>
        </div>
        <div style="line-height: 1.6; font-size: 16px;">
            <p>{content}</p>
        </div>
        <hr style="margin: 30px 0;">
        <p style="font-size: 14px; color: #666; text-align: center;">
            Sent by Your AI Learning Assistant • {date}
        </p>
    </body>
    </html>
    """.format(
        title=lesson['title'],
        duration=lesson['duration'],      
        content=processed_content,
        date=current_date,
    )

    # Send email via SES
    try:
        ses.send_email(
            Source=SENDER_EMAIL,
            Destination={'ToAddresses': [email]},
            Message={
                'Subject': {'Data': subject},
                'Body': {'Html': {'Data': body_html}}
            }
        )
        logger.info(f"Email sent to {email}")
    except ClientError as e:
        logger.error(f"SES error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps('Failed to send email')
        }

    # Update progress in DynamoDB
    try:
        table.update_item(
            Key={'employeeID': employee_id},
            UpdateExpression='''
                SET 
                    progress = if_not_exists(progress, {
                        "completedLessons": :zero,
                        "lastLessonDate": :empty
                    }),
                    progress.completedLessons = progress.completedLessons + :inc,
                    progress.lastLessonDate = :date
            ''',
            ExpressionAttributeValues={
                ':inc': 1,
                ':date': datetime.now().strftime('%Y-%m-%d'),
                ':zero': 0,
                ':empty': ""
            }
        )
        logger.info(f"Progress updated for {employee_id}")
    except ClientError as e:
        logger.error(f"DynamoDB update failed: {e}")

    # Return success
    return {
        'statusCode': 200,
        'body': json.dumps({
            'message': 'Lesson delivered successfully',
            'topic': topic,
            'email': email
        })
    }