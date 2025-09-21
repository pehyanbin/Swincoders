import {
  DynamoDBClient,
  GetItemCommand,
  UpdateItemCommand,
  PutItemCommand,
} from "@aws-sdk/client-dynamodb";
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const dynamo = new DynamoDBClient({ region: "ap-southeast-5" });
const bedrockRuntime = new BedrockRuntimeClient({ region: "us-east-1" });

const EMPLOYEE_TABLE = "employee";
const LESSON_TABLE = "lesson";

export const handler = async (event) => {
  try {
    const { userId: employeeID, lessonID } = event;

    console.log(employeeID)
    console.log(lessonID)

    if (!employeeID || !lessonID) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "employeeID and lessonID are required" }),
        headers: { "Access-Control-Allow-Origin": "*" },
      };
    }

    // 1️⃣ Get employee profile
    const employeeResult = await dynamo.send(
      new GetItemCommand({
        TableName: EMPLOYEE_TABLE,
        Key: { employeeID: { S: employeeID } },
      })
    );

    const employee = employeeResult.Item;
    if (!employee) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Employee not found" }),
        headers: { "Access-Control-Allow-Origin": "*" },
      };
    }

    const currentSummary = employee.summaryText?.S || "";

    // 2️⃣ Get the completed lesson
    const lessonResult = await dynamo.send(
      new GetItemCommand({
        TableName: LESSON_TABLE,
        Key: {
          employeeID: { S: employeeID },
          lessonID: { S: lessonID },
        },
      })
    );

    if (!lessonResult.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Lesson not found" }),
        headers: { "Access-Control-Allow-Origin": "*" },
      };
    }

    const lessonItem = lessonResult.Item;
    const lessonData = {
      lessonID: lessonItem.lessonID?.S,
      topic: lessonItem.topic?.S,
      theories: lessonItem.theories ? JSON.parse(lessonItem.theories.S) : [],
      quiz: lessonItem.quiz ? JSON.parse(lessonItem.quiz.S) : null,
    };

    // 3️⃣ Mark lesson as done
    await dynamo.send(
      new UpdateItemCommand({
        TableName: LESSON_TABLE,
        Key: { employeeID: { S: employeeID }, lessonID: { S: lessonID } },
        UpdateExpression: "SET done = :true, finishedAt = :finishedAt",
        ExpressionAttributeValues: {
          ":true": { BOOL: true },
          ":finishedAt": { S: new Date().toISOString() },
        },
      })
    );

    // 4️⃣ Generate NEW lesson object using AI
    const newLessonId = `LESSON#${Math.round(Math.random()*Math.random()*99999999)}p`;

    const prompt = `
You are an AI lesson generator for a personalized micro-learning platform.  
Here is the employee's current learning summary:
"${currentSummary}"

Here is the lesson they just completed:
- Topic: ${lessonData.topic}
- Theories: ${JSON.stringify(lessonData.theories)}
- Quiz: ${JSON.stringify(lessonData.quiz)}

Based on this information, generate the NEXT lesson as a single JSON object with this exact structure:

{
  "lessonId": "${newLessonId}",
  "userId": "${employeeID}",
  "topic": "<lesson_topic>",
  "subTopics": ["<subtopic_1>", "<subtopic_2>"],
  "theories": [
    {"title": "<theory_title>", "content": "<theory_content>"}
  ],
  "quiz": {
    "isVisible": false,
    "attemptsMade": 0,
    "maxAttempts": 3,
    "question": "<quiz_question>",
    "options": ["<option1>", "<option2>", "<option3>"],
    "correctAnswer": <index_of_correct_option>,
    "difficulty": "<Easy/Medium/Hard>"
  },
  "durationMinutes": 5,
  "level": "<Beginner/Intermediate/Advanced>",
  "feedback": "",
  "createdAt": "${new Date().toISOString()}"
}

Rules:
1. Generate 3 concise theories (~5 min reading).
2. Include 1 quiz with 3 options, correct index 0-based.
3. Quiz hidden initially (isVisible=false).
4. Level matches employee skill level based on their summary and last lesson.
5. Use lessonData + summary to pick a logical next topic.
6. Output ONLY valid JSON, no extra text.
`;

    const payload = {
      messages: [{ role: "user", content: [{ text: prompt }] }],
    };

    const response = await bedrockRuntime.send(
      new InvokeModelCommand({
        modelId:
          "arn:aws:bedrock:us-east-1:019076941004:inference-profile/us.amazon.nova-pro-v1:0",
        body: Buffer.from(JSON.stringify(payload)),
        contentType: "application/json",
        accept: "application/json",
      })
    );

    const decoded = new TextDecoder().decode(response.body);
    const responseJson = JSON.parse(decoded);
    const aiContent = responseJson.output.message.content[0].text;

    let aiLesson;
    try {
      aiLesson = JSON.parse(aiContent);
    } catch (e) {
      console.error("Failed to parse AI response:", e, aiContent);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Invalid AI response" }),
        headers: { "Access-Control-Allow-Origin": "*" },
      };
    }

    // 5️⃣ Store the generated lesson
    await dynamo.send(
      new PutItemCommand({
        TableName: LESSON_TABLE,
        Item: {
          employeeID: { S: employeeID },
          lessonID: { S: aiLesson.lessonId },
          topic: { S: aiLesson.topic },
          theories: { S: JSON.stringify(aiLesson.theories) },
          quiz: { S: JSON.stringify(aiLesson.quiz) },
          done: { BOOL: false },
          createdAt: { S: aiLesson.createdAt },
        },
      })
    );

    // 6️⃣ Update employee summary
    await dynamo.send(
      new UpdateItemCommand({
        TableName: EMPLOYEE_TABLE,
        Key: { employeeID: { S: employeeID } },
        UpdateExpression: "SET summaryText = :summary",
        ExpressionAttributeValues: { ":summary": { S: currentSummary } }, // optionally update summary if needed
      })
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Lesson marked as done and new lesson generated",
        newLesson: aiLesson,
      }),
      headers: { "Access-Control-Allow-Origin": "*" },
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
      headers: { "Access-Control-Allow-Origin": "*" },
    };
  }
};
