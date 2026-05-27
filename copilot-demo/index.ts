import { CopilotClient, approveAll } from "@github/copilot-sdk";

(async () => {
    const client = new CopilotClient();
    const session = await client.createSession({
        model: "gpt-4.1",
        streaming: true,
        onPermissionRequest: approveAll,
    });

    // Listen for response chunks
    session.on("assistant.message_delta", (event) => {
        process.stdout.write(event.data.deltaContent);
    });
    session.on("session.idle", () => {
        console.log(); // New line when done
    });

    await session.sendAndWait({ prompt: "Tell me a short joke" });

    await client.stop();
    process.exit(0);
})();

