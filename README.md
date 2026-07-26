# GMassist
**Available to use on gmassist.netlify.app
Gmail virtual assistant that reads your inbox in the background, classifies actionable emails with AI, and delivers a daily digest with one-click actions.

## What it does

GMassist continuously monitors your Gmail and surfaces four categories of action items:

| Category | What it catches |
|---|---|
| **Meetings to add** | Calls/meetings mentioned in email that aren't on your calendar |
| **Needs reply** | Important emails you haven't responded to, including overdue ones |
| **Requests pending** | Tasks, approvals, and asks from others waiting on you |
| **Schedule meeting** | "Let's find a time" threads where you need to book a slot |

At a press of a button, GMassist sends a digest that is: 
-**Clear and Easy to Read** Users won't be lost nor waste time trying to understand it. 
-**Personalized** Tailored by gpt-5.4, it shows only high priority gmails that should responded to soon. 

## One-click actions

From the dashboard, each item supports:
- **Add to Calendar** — creates a Google Calendar event
- **Reply in Gmail** — opens a pre-filled compose window
- **Schedule Meeting** — opens Google Calendar event template
- **Open Email** — jumps to the thread in Gmail
- **Done / Snooze 24h** — clears or defers the item
---

## Architecture

```
Gmail inbox
│
v  
Pub/Sub push
|
v  
/api/gmail/webhook
|
v  
email-sync worker
|
v  
AI classifier
|
v
ActionItem (postgresql)
|
v  
Dashboard ---> Read My Digest btn trigger ---> Sever fetches ActionItems from database ---> Returns JSON ---> Digest Card appears

```
