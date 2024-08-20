/// webhooks.mcbe.wtf
/// Copyright (C) 2024 Minecraft Moderators
///
/// This program is free software: you can redistribute it and/or modify
/// it under the terms of the GNU General Public License as published by
/// the Free Software Foundation, either version 3 of the License, or
/// (at your option) any later version.
///
/// This program is distributed in the hope that it will be useful,
/// but WITHOUT ANY WARRANTY; without even the implied warranty of
/// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
/// GNU General Public License for more details.
///
/// You should have received a copy of the GNU General Public License
/// along with this program.  If not, see <http://www.gnu.org/licenses/>.

import {
	createEventHandler,
	EmitterWebhookEvent,
} from "https://esm.sh/@octokit/webhooks@13.3.0";

const secret = Deno.env.get("GITHUB_WEBHOOK_SECRET");
const refToWatch = Deno.env.get("GITHUB_WEBHOOK_REF");
const discordUrl = Deno.env.get("DISCORD_WEBHOOK_URL");

async function sendMessage(content: string) {
	if (!secret || !refToWatch || !discordUrl) {
		throw new Error("Missing configuration");
	}
	const res = await fetch(discordUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content,
		}),
	});
	if (res.ok) return;
	const err = await res.text();
	console.error("Error when sending message to discord", err);
}

const eventHandler = createEventHandler({ secret });
eventHandler.on("push", async ({ payload }) => {
	if (payload.ref === `refs/heads/${refToWatch}`) {
		const content = `${payload.pusher.name} updated the rules
${
			payload.commits.map((c) =>
				`[${
					c.id.substring(0, 11)
				}](<${payload.repository.url}/commit/${c.id}>): ${c.message}`
			).join("\n")
		}

[Compare changes](<${payload.repository.url}/compare/${payload.before}...${payload.after}>)`;

		await sendMessage(content);
	}
});

Deno.serve(async (req) => {
	if (req.url.endsWith("/github")) {
		const id = req.headers.get(
			"x-github-delivery",
		) as EmitterWebhookEvent["id"];
		const name = req.headers.get(
			"x-github-event",
		) as EmitterWebhookEvent["name"];
		if (!id || !name) {
			return Response.json({
				message: "id or name is missing",
			}, { status: 400 });
		}
		const payload = (await req.json()) as EmitterWebhookEvent["payload"];
		eventHandler.receive({
			id,
			name,
			// @ts-expect-error wtf?
			payload,
		});
		return Response.json({
			message: "Triggered webhook",
		});
	}
	return Response.json({ status: "OK" });
});
