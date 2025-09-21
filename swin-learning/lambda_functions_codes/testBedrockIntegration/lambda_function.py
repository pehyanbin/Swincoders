import json
import boto3
from datetime import datetime

# Define your lesson prompt
lesson_prompt = """
You are an AI lesson generator for a personalized micro-learning platform. 
Generate a new lesson for a user based on their learning goals, current skill mastery, and preferred topic. 
The lesson must follow this JSON format:

{
  "lessonId": "LESSON#<unique_id>",
  "userId": "<user_id>",
  "topic": "<lesson_topic>",
  "subTopics": ["<subtopic_1>", "<subtopic_2>"],
  "theories": [
    {"title": "<theory_title>", "content": "<theory_content>"}
  ],
  "quiz": {
    "isVisible": false,
    "attemptsMade": 0,
    "maxAttempts": 3,
    "questions": [
      {
        "question": "<quiz_question>",
        "options": ["<option1>", "<option2>", "<option3>"],
        "correctAnswer": <index_of_correct_option>,
        "difficulty": "<Easy/Medium/Hard>"
      }
    ]
  },
  "durationMinutes": 5,
  "level": "<Beginner/Intermediate/Advanced>",
  "feedback": "",
  "createdAt": "<ISO_timestamp>"
}

Rules:
1. Generate 1 topic and 2-3 subtopics per lesson.
2. Theories should explain key concepts concisely to fit ~5 min reading.
3. Include 1 quiz with 3 options; mark correct answer index 0-based.
4. Quiz hidden initially (isVisible: false).
5. Duration ≤ 5 min.
6. Lesson level matches user's current level.
7. Use user interests, skill gaps, or summaries to decide lesson topic.
8. Output only valid JSON, no extra text.
"""

def lambda_handler(event, context):
    try:
        # Extract user info from event
        user_id = event.get("userId", "USER#001")
        current_level = event.get("currentLevel", "Beginner")
        skill_gaps = event.get("skillGaps", [])
        interests = event.get("interests", [])
        goals = event.get("goals", "Learn something new")

        # Combine prompt with user data
        full_prompt = f"""{lesson_prompt}
Input Variables:
- userId: {user_id}
- currentLevel: {current_level}
- skillGaps: {json.dumps(skill_gaps)}
- interests: {json.dumps(interests)}
- goals: {goals}
"""

        # Initialize Bedrock Runtime client
        bedrock_runtime = boto3.client('bedrock-runtime', region_name='us-east-1')

        # Build request body for Amazon Nova Pro
        # Format based on: https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-nova.html
        payload = {
            "inputText": full_prompt,
            "textGenerationConfig": {
                "maxTokenCount": 800,
                "temperature": 0.7,
                "topP": 0.9
            }
        }

        # Invoke the model
        response = bedrock_runtime.invoke_model(
            modelId="arn:aws:bedrock:us-east-1:019076941004:inference-profile/us.amazon.nova-pro-v1:0",
            body=json.dumps(payload),
            contentType="application/json",
            accept="application/json"
        )

        # Decode and parse the response
        response_body = json.loads(response['body'].read().decode('utf-8'))

        # Amazon Nova Pro returns generated text in 'outputText'
        raw_text = response_body.get('outputText', '').strip()

        # Clean and extract JSON (in case model adds ```json or extra text)
        start = raw_text.find('{')
        end = raw_text.rfind('}')
        if start == -1 or end == -1:
            raise ValueError("No JSON found in model response")

        json_str = raw_text[start:end+1]

        # Parse into Python dict
        lesson_data = json.loads(json_str)

        # Add createdAt if missing
        if "createdAt" not in lesson_data:
            lesson_data["createdAt"] = datetime.utcnow().isoformat() + "Z"

        return {
            "statusCode": 200,
            "headers": {
                "Content-Type": "application/json"
            },
            "body": json.dumps(lesson_data, indent=2)
        }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            "statusCode": 500,
            "body": json.dumps({
                "error": str(e),
                "message": "Failed to generate lesson"
            })
        }