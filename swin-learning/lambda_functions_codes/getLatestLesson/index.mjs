import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-southeast-5" });

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Allow-Methods": "OPTIONS,POST",
      },
      body: "",
    };
  }

  try {
    const { userId } = event || "{}"; // get from POST body

    if (!userId) {
      return {
        statusCode: 400,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify({ error: "Missing userId" }),
      };
    }

    const params = {
      TableName: "lesson",
      FilterExpression: "employeeID = :userId AND done = :done",
      ExpressionAttributeValues: {
        ":userId": { S: `${userId}` }, // ✅ match your SK format
        ":done": { BOOL: false },
      },
    };

    const result = await dynamo.send(new ScanCommand(params));

    const lessons = result.Items.map((item) => ({
      lessonID: item.lessonID?.S,
      userId: item.employeeID?.S,
      topic: item.topic?.S,
      subTopics: item.subTopics ? JSON.parse(item.subTopics.S) : [],
      theories: item.theories ? JSON.parse(item.theories.S) : [],
      quiz: item.quiz ? JSON.parse(item.quiz.S) : null,
      durationMinutes: item.durationMinutes?.N ? Number(item.durationMinutes.N) : null,
      level: item.level?.S,
      feedback: item.feedback?.S ?? "",
      createdAt: item.createdAt?.S,
      done: item.done?.BOOL ?? false,
    }));

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
      body: JSON.stringify({ lessons }),
    };

  } catch (err) {
    console.error("Error fetching lessons:", err);
    return {
      statusCode: 500,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: JSON.stringify({ error: "Failed to fetch lessons" }),
    };
  }
};
