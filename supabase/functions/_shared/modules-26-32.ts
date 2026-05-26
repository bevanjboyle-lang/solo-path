// _shared/modules-26-32.ts
// Modules 26-32 — Track F: Rejection & Resilience.
// Coaching layer Phase 5b (admin/coaching-layer-design.md v1.10 §4.4).
// Generated 2026-05-18.
//
// Track F covers the psychological topics no career book covers properly:
// the moments where most independents quit (silence, explicit rejection,
// imposter spikes, week-three doubt, the "just take a job" pull, peer
// comparison anxiety, the family conversation). Each module follows the
// same shape as the existing 25, with a tighter question set (2-3 questions)
// because these topics personalise from light context rather than the
// 5-question operational shape Tracks A-D use.
//
// Voice: warmer than Tracks A-D on this topic class, but the contract still
// holds — no abstract reassurance, no em-dashes, no banned words, no
// motivational language. Direct, specific, older-sibling. The lesson the
// LLM generates from each output_structure must name the friction precisely
// and give one concrete next move, never platitudes.

import type { RichModule } from "./modules-rich-types.ts";

export const MODULES_26_32: Record<number, RichModule> = {
  26: {"id":26,"name":"Handling silence after sending","track":"F","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Resilience","trigger_phase":"Triggered when a sent move stays silent past 5 days","estimated_minutes":4,"output_type":"silence_response","description":"The most common moment people quit. What silence usually means, and the specific next move when a sent message doesn't come back.","what_you_get":"The honest read on what silence usually means, the specific next move for your day-count and relationship type, and what not to do.","questions":[{"id":"sent_recency","text":"How many days has it been since you sent the message you're thinking about?","type":"choice","options":["1-3 days","4-7 days","8-14 days","Over two weeks"]},{"id":"sent_relationship","text":"Was this a cold contact, a warm reconnect, or a referral introduction?","type":"choice","options":["Cold (no prior contact)","Warm reconnect (someone I used to know)","Referral introduction (someone introduced us)","Existing contact I had not spoken to in a while"]},{"id":"usual_response_time","text":"In your experience, how quickly do people in your network normally reply to non-urgent professional messages?","type":"choice","options":["Within 24 hours typically","Within a few days","A week is normal","Highly variable, often longer"]}],"output_structure":{"what_silence_usually_means":"1-2 sentences naming what silence at this day-count and relationship type usually indicates. Calm, factual. Not 'they hate you'. Not 'they're definitely busy'. The honest distribution.","what_to_do_now":"ONE specific next move based on day-count and relationship. Cold + day 3 = wait, cold + day 7 = single-line follow-up, warm + day 5 = ask if you missed a reply, etc. Concrete and observable, no frameworks.","what_not_to_do":"The 2-3 common mistakes at this moment: not the long apologetic follow-up, not the second cold push within the same week, not the assumption that silence means a definitive no.","longer_view":"One sentence on the portfolio framing. The individual move is cheap; the portfolio works because each move is cheap. Reframes the silence as data, not failure.","caveat":"This is general guidance based on the typical pattern of professional outreach. The specifics of your relationship and context override the defaults here."},
    module_addendum: {
      module_decision_frame: "User has sent a move and it has gone silent (Q1 days since sent: 1-3, 4-7, 8-14, 14+), contact relationship (Q2 cold / warm reconnect / referral / existing), and their network's typical response time (Q3). Produce a calm honest read on what silence at this day-count and relationship type usually indicates, ONE specific next move calibrated to those inputs, the 2-3 common mistakes to avoid, and the portfolio framing that reorients silence as data not failure. The strong opinion: the individual move is cheap. The portfolio works because each move is cheap. Silence at day 3 of a cold ask is not silence; it is week one. Silence at day 14 of a warm reconnect is information.",
      module_specific_knowledge: `Typical response rates and timing for professional outreach in the UK 2026/27.

Cold outreach (no prior connection): reply rate to a well-targeted cold message is around 5-15% over a 14-day window. Most replies that come arrive within 5 working days. After 7 days, the probability of a reply drops sharply. After 14 days with no reply, treat as non-response for portfolio purposes.

Warm reconnect (someone you used to know, no recent contact): reply rate 30-50% over 14 days. Most replies within 7 days. After 14 days, a single follow-up is appropriate; after that, treat as non-response and re-engage in 2-3 months with a different anchor.

Referral introduction (someone introduced you): reply rate 50-70% over 7 days. Most replies within 4 days. If no reply by day 7, a courteous single follow-up via the introducer is appropriate (the introducer's reputation is also at stake; they typically nudge).

Existing contact you haven't spoken to recently: reply rate 60-80% over 14 days. Variable timing based on their work load and your prior cadence. After 14 days, a short follow-up referencing your prior context is appropriate.

What silence usually means by day-count.

Day 1-3 of any cold or warm outreach: not silence. They have not seen it, have seen it and need time to think, or are batching email. No action required.

Day 4-7 cold: declining probability but still in normal range. Patience is the right move; no follow-up yet.

Day 4-7 warm or referral: borderline. A single line follow-up is appropriate ("just bumping this in case it got buried") if the original ask was specific. Not appropriate if the original was an open relationship message.

Day 8-14: time to send a single follow-up if you haven't, or close the loop and move on if you have. Two follow-ups in 14 days reads as pressure rather than patience.

Day 14+: treat as non-response for portfolio purposes. Re-engagement in 8-12 weeks with a different anchor is the next legitimate move.

What silence almost never means: a definitive no. Most non-replies are about the recipient's bandwidth and priorities, not a judgement on you. Reading silence as a personal rejection is a category error that disrupts pipeline discipline.

What not to do.

The long apologetic follow-up. ("I'm sorry to bother you again, I know you must be very busy...") Reads as low-status; signals you regret making the original ask; invites the recipient to feel sorry for you rather than respond on substance.

The same-week second push. (Day 1: send; Day 4: follow-up; Day 7: another follow-up.) Reads as pressure or desperation. Reset the cadence to weekly at most.

The assumption that silence means a definitive no. Many opportunities revive months later because the recipient was busy at the original moment. Closing the door yourself is sometimes the only way it closes.

The cold replacement message that doesn't reference the prior thread. ("Hi, I'd love to discuss [X]...") Treats the recipient as a new contact when they already have your prior message in their inbox. Confusing for them; signals lack of attention from you.

The portfolio framing. In a portfolio of 20 moves per quarter, the typical pattern is: 2-3 land warm, 4-5 land with a polite no, 12-14 go silent. The 2-3 warm leads carry the quarter. Each individual move is cheap precisely because the portfolio is built on the assumption that most won't land. Silence is signal that this move is one of the 12-14, not a verdict on you.`,
      curated_caveat_base: "Response rates and timing patterns vary by industry, season (December and August reduce reply rates significantly), and the recipient's individual context. The patterns above are typical for UK professional outreach. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Note the day-count and relationship type for this specific silence", target_day: 1, verification_question: "Have you logged the specific silence you are tracking, with day count and relationship type?" },
        { action_hint: "Take the recommended next move for this specific case", target_day: 3, verification_question: "Have you taken (or deliberately decided not to take) the next move for this specific silence?" },
      ],
      prerequisite_outputs: null,
    },
  },

  27: {"id":27,"name":"Handling explicit rejection","track":"F","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Resilience","trigger_phase":"Triggered when a contact explicitly declines","estimated_minutes":4,"output_type":"rejection_response","description":"When someone says no directly. How to separate the no from the relationship, what to do in the next 48 hours, and the move most people miss.","what_you_get":"The 48-hour move, the often-missed relationship preservation follow-up, and one sentence on what a clear no actually buys you.","questions":[{"id":"rejection_type","text":"What kind of no was it?","type":"choice","options":["A clear no with no reason","A soft no (\"not right now\", \"maybe later\")","A no with a specific reason","A redirect (\"not me, try X\")"]},{"id":"relationship_status","text":"Do you want this relationship to continue beyond this engagement?","type":"choice","options":["Yes, it's a long-term contact worth preserving","Yes, but it was transactional","No, this was a one-off","Unsure"]},{"id":"emotional_weight","text":"How much is this one weighing on you right now?","type":"choice","options":["Lightly, it stings but it's fine","Moderately, it's on my mind","Significantly, it's affecting the rest of my week"]}],"output_structure":{"what_the_no_actually_means":"1-2 sentences reading the no honestly. A soft no often is a no. A redirect is often a gift. A reason-given no usually contains information worth using. Match the read to the type from the input.","the_48_hour_move":"ONE specific action to take in the next two days. The standard move: a short, gracious reply that acknowledges + asks one clarifying question (if a reason was given) or thanks them and closes the loop (if it was a clear no).","relationship_preservation":"The often-missed follow-up that keeps the door open without being awkward. The specific message to send 8-12 weeks from now if relationship_status says continue, including what to anchor it to.","longer_view":"One sentence on what this no buys you. The honest version: a clear no removes a maybe from your pipeline, which is more useful than a polite delay.","caveat":"When emotional weight is significant, the next move can wait 24 hours. The reply you draft tomorrow morning will almost always be better than the one you draft tonight."},
    module_addendum: {
      module_decision_frame: "User received an explicit no (Q1 type: clear no / soft no / no with reason / redirect), wants this relationship to continue or not (Q2), and the no is weighing on them lightly / moderately / significantly (Q3). Produce what the specific no actually means (calibrated to type), the ONE 48-hour move, the often-missed relationship preservation follow-up with specific message anchor for the 8-12 week point, and the longer view on what a clear no buys. The strong opinion: a clear no removes a maybe from your pipeline, which is more useful than a polite delay. The relationship-preservation follow-up is the move most people miss because it requires not taking the no personally.",
      module_specific_knowledge: `Reading the type of no.

Clear no with no reason. Honest and final. The recipient either is not interested, is not in a position to engage, or does not feel the need to explain. Sometimes this reads as cold but is often the most respectful response, they have saved you weeks of polite ambiguity.

Soft no ("not right now", "maybe later"). Usually means no in the current context. Sometimes a genuine timing issue worth revisiting. The signal is in whether they offered a specific timing (revisit in 3 months) or a vague one (maybe later). Specific timing is signal; vague timing is no with politeness layered on.

No with a specific reason. The reason is the actual information. Use it. Common reasons: budget, timing, scope mismatch, internal hire decision, existing relationship with another supplier. Each implies a different follow-up move.

Redirect ("not me, try X"). Often the most valuable response. The recipient is doing you a favour by routing you. Treat the redirect as a warm referral; the original contact has effectively introduced you (and you can name them when you reach out to the referred contact).

The 48-hour move by no type.

Clear no: short gracious reply. "Thank you for the quick response, makes sense. I'll keep you in mind if anything changes my end that could be relevant for you in future." One line. Closes the loop, leaves the door open, takes the no professionally.

Soft no with vague timing: short reply acknowledging. "Understood, thanks for letting me know. Mind if I check back in [specific period, 8 weeks if their language suggested it, 6 months if it felt definitively soft]?" Specific time-bounded check-in is harder to refuse than a vague "stay in touch".

Soft no with specific timing: short reply confirming and putting it in your calendar. "Perfect, I'll come back to you in [specific period]. Anything I should be ready with by then?" Sets up the follow-up cleanly.

No with reason: short reply acknowledging the reason + one clarifying question if appropriate. "That makes sense, appreciate the directness. Quick clarifying question: when you say [reason], do you mean [specific interpretation]? Helpful for me to understand the landscape better." Not pushing back, not arguing the no, just extracting more information.

Redirect: thank them, follow up with the referred contact within 5 working days using their name as the introduction.

The often-missed relationship preservation follow-up. 8-12 weeks after the initial no, send a single message that does NOT revisit the original ask. Anchor it to something specific the contact would find useful: an article relevant to their work; a question about something they mentioned; a thoughtful observation about their company or sector. The message exists to keep the relationship warm; you are NOT asking for anything.

Specific anchors by relationship.

To a contact who said no with a specific reason: anchor to something that addresses the reason ("I saw [news] on [topic you mentioned was the constraint], thought of our conversation").

To a contact who redirected you: anchor to the outcome of the redirect ("just wanted to say the conversation with [referred contact] was useful, thank you for the steer").

To a contact who gave a clear no: anchor to their own work ("saw your team's announcement of [thing], well-deserved").

The relationship preservation follow-up generates a reply rate around 40-60%, significantly higher than re-pitching the original ask. It builds the long-term relationship without the awkwardness of asking again too soon.

What a clear no buys you. Three things specifically.

(1) It removes a maybe from your pipeline. A maybe consumes mental energy and time. A no clears the slot for a fresh ask.

(2) It often contains useful information about the market. The pattern of nos you receive points to where you are mis-positioned, mis-priced, or addressing the wrong segment.

(3) It opens the relationship to evolve. A relationship that survives a clear no is stronger than one that has only been transactional. The contact who said no can later become a referrer, an introducer, or a future client when the context shifts.

Emotional weight management. When a specific no lands hard, three things help.

Take the time. The reply you draft tomorrow morning is almost always better than the one you draft tonight. 24 hours is fine; 48 is fine.

Talk to one person who knows your work. Not to vent; to recalibrate. The person who sees your work clearly can usually name why this specific no is not the data point your imposter voice is making it.

Separate the no from the relationship. The no is about this specific ask, this specific moment, this specific context. It is not about you as a professional. The trap is conflating the two.`,
      curated_caveat_base: "When emotional weight is significant, the framework above is structure not pressure. Take the time you need. Talk to a person who knows your work. The 48-hour move can wait a day; the relationship preservation follow-up can wait until you can write it without strain. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Send the 48-hour acknowledgement", target_day: 2, verification_question: "Have you sent a short acknowledgement reply to the no?" },
        { action_hint: "Schedule the 8-12 week relationship preservation follow-up", target_day: 1, verification_question: "Have you set a calendar reminder for the relationship preservation follow-up?" },
      ],
      prerequisite_outputs: null,
    },
  },

  28: {"id":28,"name":"Handling the imposter spike after a small win","track":"F","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Resilience","trigger_phase":"Triggered after first reply / first paid hour / first explicit interest","estimated_minutes":4,"output_type":"imposter_reframe","description":"The strange thing that happens after the first reply, the first paid hour, the first introduction landing. Why the imposter voice gets louder right when things start working, and the specific move to make next.","what_you_get":"Why this spike happens, the specific replacement thought, and one observable action that takes the win seriously without overcorrecting.","questions":[{"id":"win_type","text":"What was the small win?","type":"choice","options":["First reply to outreach","First paid work or first invoice","First meaningful introduction landing","First explicit expression of interest","Something else"]},{"id":"imposter_voice","text":"In one line, what is the imposter voice currently saying? (Optional, leave blank if you'd rather not articulate it.)","type":"text","optional":true,"placeholder":"e.g. \"They'll realise I'm out of my depth.\""}],"output_structure":{"why_this_spike_happens":"1-2 sentences naming the pattern. Imposter peaks at the moment the abstract becomes real, not when things go wrong. Use the specific win type from the input.","the_specific_thought_to_replace":"The cognitive move. If they shared an imposter line in Q2, address it directly. Otherwise: name the typical replacement thought ('this is the data point I was working for' rather than 'they'll realise I'm out of my depth').","the_next_action":"ONE small observable action in the next 24 hours that takes the win seriously without overcorrecting into either grandiosity or self-doubt. Often: log it somewhere, name the next move in the same direction, do not pivot the strategy on a single data point.","longer_view":"One sentence on what this spike means about your trajectory. The honest version: this discomfort tracks closely with the work starting to land. People who never feel this often are not pushing hard enough.","caveat":"If the imposter voice is consistently loud across multiple wins over months, that's a different signal worth talking to a coach or therapist about. This module addresses the in-the-moment spike, not chronic patterns."},
    module_addendum: {
      module_decision_frame: "User just had a small win (Q1: first reply / first paid / first introduction / first interest / other) and may have an imposter voice (Q2 optional text). Produce a calm naming of why this spike happens (the abstract becoming real is harder than things going wrong), the specific cognitive replacement thought tailored to their win type and imposter line, ONE small observable action in the next 24 hours that takes the win seriously without overcorrecting, and the longer view on what this discomfort tracks with. The strong opinion: this discomfort tracks closely with the work starting to land. People who never feel this often are not pushing hard enough.",
      module_specific_knowledge: `The structural pattern of imposter at small wins. Imposter feelings peak NOT at moments of failure but at moments when the abstract version of your work becomes a specific real thing in the world.

When the work is theoretical, the imposter voice has little to attach to. There are no specific outcomes to evaluate against, no specific recipients to misjudge, no specific identity at stake. The brain treats it as relatively low-risk.

When the work becomes specific (a reply lands, an invoice is paid, an introduction takes), the imposter voice gets specific too. The brain now has a concrete thing to model failure against. The spike is the system updating from "thinking about doing this" to "actually doing this".

This is also why the spike comes more from wins than from setbacks. Setbacks confirm the imposter's existing prediction; wins force the prediction to update. The update is uncomfortable.

The replacement thought pattern. The unhelpful default thought: "they'll realise I'm out of my depth." This frames the win as a misperception by the other party that will eventually be corrected.

The replacement thought: "this is the data point I was working for." Frames the win as expected information, not a misperception. Reorients from "they made a mistake" to "the system is doing what it's supposed to do".

Specific replacement thoughts by win type.

First reply to outreach: "Replies happen at the rate replies happen. Not every message gets one. This one did. That tells me the targeting was right enough."

First paid work or first invoice: "Someone paid me money for work I produced. The work was theirs to evaluate; they evaluated it; they paid. The transaction is the transaction."

First meaningful introduction landing: "The person who introduced us thought it was worth doing. They have their own reputation at stake. They wouldn't have made the introduction if they thought it was a mismatch."

First explicit expression of interest: "Interest is interest. It is not yet a commitment. I don't have to be ready for the commitment to receive the interest. I have to be ready to have the next conversation."

The next action. ONE small thing in the next 24 hours that takes the win seriously without overcorrecting.

Log it. A note somewhere you'll see again, a journal entry, a Notion page, a text to a friend. Naming the win specifically makes it harder for the imposter voice to erase it.

Name the next move in the same direction. The win is one data point on a trajectory; the trajectory continues. What is the next message you'll send, next conversation you'll have, next piece of work you'll do? Same direction, no pivot.

What NOT to do. Do not redesign the strategy on a single data point. The reply or the paid hour confirms the strategy is reasonable; it does not confirm the strategy is finished. The temptation after a small win is to immediately optimise, different positioning, different audience, different price. Resist. Let the strategy run for several more data points before adjusting.

Do not over-announce. The temptation to post about the win publicly is strong, especially when validation feels rare. Most small wins are best held privately and accumulated. The one exception: telling the specific people who supported you to get to this point (a mentor, a partner, a peer who has been listening to your work). Their reception of the news compounds the win; broader public posting often deflates it.

What chronic imposter looks like and when to seek outside support. The spike addressed here is in-the-moment, in response to a specific win. If the imposter voice is consistently loud across many wins over months, i.e. you are accumulating evidence and the voice is not updating, that is a different pattern. It often responds well to a few sessions with a coach or therapist who can help you examine why the evidence isn't landing.`,
      curated_caveat_base: "If the imposter voice is consistently loud across many wins over months without updating to the evidence, that is a different pattern than the in-the-moment spike addressed here. A few sessions with a coach or therapist who works with high-performing professionals is often the right next step. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Log the specific win somewhere durable", target_day: 1, verification_question: "Have you logged this specific win where you'll see it again?" },
        { action_hint: "Name and commit to the next move in the same direction", target_day: 1, verification_question: "Have you named the next move you'll take in the same direction this week?" },
      ],
      prerequisite_outputs: null,
    },
  },

  29: {"id":29,"name":"Handling the doubt at week three","track":"F","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Resilience","trigger_phase":"Triggered around days 18-24 of the activation plan","estimated_minutes":4,"output_type":"week_three_reframe","description":"The structural moment when momentum dips. What week three usually is, why most people misread it as failure, and the specific re-engagement move that gets the trajectory back.","what_you_get":"What week three actually is, the specific reframe, and one concrete thing to do in the next 72 hours.","questions":[{"id":"current_state","text":"Where are you in the dip?","type":"choice","options":["Just hit it, things suddenly feel hard","Mid-week, in the middle of it","Coming out, but not sure if I'm back yet"]},{"id":"dominant_friction","text":"What is your current dominant friction? (Optional)","type":"text","optional":true,"placeholder":"e.g. \"I've sent messages and heard nothing back\""}],"output_structure":{"what_week_three_usually_is":"1-2 sentences naming the structural pattern. The initial momentum carries you through weeks one and two; week three is when the first wave of replies (or non-replies) lands and the abstract becomes specific. The dip is the system working, not breaking.","the_specific_reframe":"Name the typical misread (\"it's not working\") and the actual read (\"it's working at the typical rate, which is slower than the activation high suggested\"). If they shared a friction in Q2, address it directly.","the_re_engagement_move":"ONE concrete thing for the next 72 hours. The most common right move: pick the single most overdue task in the plan and do the smallest possible version of it. Specific to their current_state from Q1.","longer_view":"One sentence on what week three breaks. The honest version: most people who quit quit here. People who make it to week four usually break through in weeks five to seven.","caveat":"If the dip extends past week four with no movement, that's the moment to look at the plan structure rather than push through harder. The Replan affordance exists for exactly this signal."},
    module_addendum: {
      module_decision_frame: "User is in or near the week-three dip (Q1 current state: just hit / mid-week / coming out) and may have named a dominant friction (Q2 optional text). Produce a calm naming of what week three structurally is (the system working not breaking), the specific reframe from 'it's not working' to 'it's working at the typical rate', ONE concrete next-72-hours move (typically the smallest version of the most overdue plan task), and the longer view that most people who quit quit here. The strong opinion: week three breaks most independents who quit. People who make it to week four usually break through in weeks five to seven.",
      module_specific_knowledge: `The structural pattern of week three. The first two weeks of a new activation plan run on the high of having a plan. The work feels generative. The messages get sent, the conversations get scheduled, the system feels alive. Most of the friction in weeks one and two is execution friction (technical setup, drafting first outputs, calendar negotiation) rather than reception friction.

Week three is when reception friction lands. The first wave of replies (and non-replies) from messages sent in weeks one and two arrives. Some of the conversations scheduled in week two happen and turn out to be slower than hoped, more procedural than expected, or less productive than the activation high predicted.

The dip is the system working as expected. It is not the plan failing. It is the activation high meeting normal-rate reality.

Why people misread the dip. The activation high creates an implicit expectation that the rate of progress will continue. When the rate normalises (which it must, mathematically), the comparison to the activation week feels like things are getting worse rather than levelling out at typical rate.

Three common misreads of the dip.

Misread 1: "It's not working" → actually: "it's working at the rate things actually work, which is slower than the activation high suggested."

Misread 2: "I'm doing it wrong" → actually: "I'm doing the work; the work has its own pace and the pace is slow."

Misread 3: "I need to change strategy" → actually: "premature strategy change at week three abandons the work that was about to land."

What the dominant frictions usually are at week three.

"I've sent messages and heard nothing back." The standard pattern, see Module 26 for the day-count framework. Most cold messages do not reply; most warm messages reply within 7-10 days. Week three sits exactly in the window where the first set of non-replies has resolved into silence and the next set is mid-cycle.

"I had three calls and they were all polite but vague." Discovery calls are mostly vague. The conversion from vague-but-polite first call to specific second conversation is what week four and five test. Vague first calls are not failure; they are filtration.

"I'm spending all my time on admin and none on the actual work." Activation-phase admin (legal, tax, banking, tools) is front-loaded. The admin tapers from week three; the time freed redirects to outreach and delivery.

"I'm losing faith in the strategy." Loss of faith in week three is a structural feature, not a strategic signal. Distinguish: "I have specific evidence the strategy is wrong" (real signal, worth examining) from "I feel less excited than I did in week one" (normal pattern, push through).

The re-engagement move. ONE concrete thing in the next 72 hours. The most common right move: pick the single most overdue task in the plan and do the smallest possible version of it.

If the most overdue task is a difficult message, write three sentences and send. Not a perfect message; just the smallest version.

If the most overdue task is a piece of work to deliver, do 25 minutes on it without optimising for completion.

If the most overdue task is a conversation you've been postponing, send the calendar invite without overpreparing.

The point of "smallest version" is to restart momentum. Once the task is moving, the next task is easier. The plan was designed to be incrementally executable; the week three dip makes the increments feel heavy. Reduce the increment, not the direction.

When the dip extends past week four. If you reach the end of week four still feeling stuck, with no movement on outputs, that is the signal to look at the plan structure rather than push through harder. The Replan affordance exists for exactly this case. The signs that Replan is the right move (rather than continued execution): the plan tasks no longer feel relevant to your situation; the targets you set in week one no longer feel achievable for reasons specific to your context; the friction is structural (no pipeline of any kind) rather than transitional.

What week three breaks. The independents who quit usually quit between days 18 and 28. They quit because the gap between the activation high and the week-three reality reads as evidence the work is not for them. People who make it to week four, by reducing the increment, holding direction, and showing up for the smallest version of the next task, typically break through to first reply / first paid / first introduction by weeks five to seven.`,
      curated_caveat_base: "If the dip extends past week four with no movement on outputs, the right move is structural review of the plan rather than continued push. Use the Replan affordance for this. The framework above assumes a transitional dip; chronic dip points at plan structure or external constraint. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Pick the most overdue task in your plan", target_day: 1, verification_question: "Have you identified the single most overdue task in your plan?" },
        { action_hint: "Do the smallest possible version of that task in the next 72 hours", target_day: 3, verification_question: "Have you completed the smallest possible version of the most overdue task?" },
      ],
      prerequisite_outputs: null,
    },
  },

  30: {"id":30,"name":"Handling the \"should I just take a job\" moment","track":"F","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Resilience","trigger_phase":"Triggered when the safe option starts to look attractive again","estimated_minutes":5,"output_type":"job_pull_decision","description":"When the safe option starts to look attractive again. What's actually happening, what's worth pausing the plan for vs. not, and the specific decision framework before you act.","what_you_get":"The signal-vs-noise read, three decision questions to answer in writing, and the honest version of what pausing the plan actually costs.","questions":[{"id":"trigger","text":"What surfaced this thought today?","type":"choice","options":["A slow week with no replies","A specific job opportunity that landed","Financial pressure","A family conversation","General doubt without a specific trigger"]},{"id":"financial_runway","text":"How much runway do you have at your current burn rate?","type":"choice","options":["Less than 3 months","3-6 months","6-12 months","Over 12 months","I don't track this precisely"]},{"id":"opportunity_specifics","text":"Is there a specific job on the table right now?","type":"choice","options":["Yes, a concrete offer","Yes, an early conversation","No, this is hypothetical"]}],"output_structure":{"whether_this_is_signal_or_noise":"The read. A slow week + 12 months runway = noise. A concrete offer + sub-3-month runway = signal. Match the read to the inputs from Q1, Q2, Q3 specifically.","the_decision_framework":"Three questions to answer in writing before any move. Examples: (1) If I take this job, what's the smallest version of independent work I keep alive in parallel? (2) Is the runway pressure real or is the work pressure real? (3) What would the version of me writing this in three months hope I did?","what_pausing_actually_costs":"The honest version of what pausing the plan now costs vs. what taking the job buys. Includes: 30 days in is roughly halfway to first revenue for most paths; six months of salaried work resets the activation runway, not the strategy.","longer_view":"One sentence reframing the choice. The honest version: taking a job is often the right move and is not failure. Pausing the plan badly is failure. There is a way to do this that preserves the option.","caveat":"This module is decision support, not advice. A real financial cliff or a meaningful job offer always deserves a conversation with someone who knows your specific situation. Use this to think clearly, then talk to a person."},
    module_addendum: {
      module_decision_frame: "User has surfaced the 'take a job' thought (Q1 trigger: slow week / specific opportunity / financial pressure / family conversation / general doubt), with financial runway (Q2 sub-3 / 3-6 / 6-12 / 12+ / untracked), and possibly a concrete job on the table (Q3 concrete offer / early conversation / hypothetical). Produce a calm signal-vs-noise read calibrated to those inputs, three decision questions to answer in writing before any move, the honest version of what pausing the plan now actually costs vs what a job buys, and the longer view that taking a job is often the right move and not failure. The strong opinion: pausing the plan badly is failure; pausing the plan well preserves the option. There is a way to do this that keeps the work alive.",
      module_specific_knowledge: `Signal vs noise read by input combination.

Slow week + 12+ months runway + hypothetical: noise. The thought surfaced because the week was hard, not because the situation has changed. The right move is to acknowledge the thought, name what specifically triggered it, and return to the plan. 48 hours from now the thought will feel different.

Slow week + 3-6 months runway + hypothetical: borderline. Slow weeks always feel worse with less runway behind them. The thought is worth examining for content but not worth acting on yet. Re-read the plan; check whether the slow week reflects a real plan problem or normal-rate variance.

Specific job opportunity that landed + any runway + concrete offer: signal worth considering carefully. Has the offer arrived because the market is shifting in a way you hadn't predicted, or has it arrived because someone you used to work with reached out independently? The first is information about the market; the second is information about your network.

Financial pressure + sub-3 months runway + any other input: high signal. A real financial cliff is a real signal and deserves a real response, which might be taking a job, taking interim or contract work, raising emergency funding, or restructuring expenses. Do not push through on willpower; address the cliff.

Family conversation surfaced this + any runway + hypothetical: signal worth taking seriously about the family conversation, not necessarily about the job. The family conversation has surfaced anxiety. Module 32 covers the structure for that conversation. The job thought may resolve once the family conversation has been had properly.

General doubt without specific trigger + any inputs: noise. The brain looks for plausible alternatives during dips. Note the doubt; do not act on it.

The three decision questions to answer in writing before any move.

Question 1: If I take this job, what is the smallest version of independent work I keep alive in parallel?

The trap of taking a job after weeks of activation work is letting the activation atrophy completely. Reasoning: the activation work has cost you weeks of focus, built specific positioning and relationships, and that infrastructure has value even if you take a job. The question is what you preserve.

Concrete smallest versions: one paid piece of work per quarter; one conversation per fortnight with a network contact; one piece of written output every six weeks; an active LinkedIn presence (10 minutes per week).

The smallest version costs 4-8 hours per month and keeps the optionality alive. If the job ends in 12-24 months, you're not starting from zero.

Question 2: Is the runway pressure real or is the work pressure real?

Runway pressure is mathematical: months of savings divided by monthly burn rate. Below 3 months is real cliff; 3-6 months is real pressure; 6-12 months is comfort under stress; 12+ months is comfort.

Work pressure is psychological: discomfort with uncertainty, with the slowness of pipeline, with the lack of validation. Work pressure compounds when it pretends to be runway pressure ("I need to take a job because... actually I just want the work to feel easier").

Naming which kind of pressure is operating clarifies the right response. Runway pressure → take the most lucrative work available, including a job. Work pressure → address the discomfort directly, often by talking to someone who knows your work, or by adjusting the plan structure.

Question 3: What would the version of me writing this in three months hope I did?

Three-months-from-now-you has the perspective on whether this was a real pivot point or a hard week. Imagine writing yourself a note from three months out: what did you do, and how do you feel about it now? Did you take the job and feel relief that the pressure lifted? Did you take the job and miss the work? Did you stay on the plan and break through? Did you stay on the plan and burn out?

Most people, asked this question, find that three-months-out-them would advise either taking the job with the optionality preserved (Question 1) or staying on the plan with a clear runway-pressure conversation underway (Question 2).

What pausing the plan actually costs.

If you are 30+ days into the activation plan and have built some pipeline and positioning, pausing now and taking a job costs roughly: the momentum that would have generated first revenue in months 2-4; the specific positioning you've built which decays over 6-12 months without active maintenance; the relationships you've started which need light maintenance to stay warm.

Pausing does NOT cost: the skills you've built; the knowledge of your market you've gained; the plan itself (it can be picked up).

What a job buys.

The obvious: regular income, the cessation of runway anxiety, employer benefits.

The less obvious: time to think more clearly about what you actually want from independence (often easier with income pressure removed); a renewed network through the new role; the chance to test whether you actually want independent work or whether the appeal was theoretical.

The longer view. Taking a job is often the right move and is not failure. The independents who later succeed often have an employment chapter in the middle of their journey. The ones who fail are usually the ones who pause the plan badly: drop everything, lose the network, lose the positioning, and find themselves in 18 months wanting to leave the job and starting from zero again.

The right pause preserves the option. Take the job; keep one piece of independent work alive; maintain the network at minimum cadence; come back to the plan when the conditions are different.`,
      curated_caveat_base: "This module is decision support, not advice. A real financial cliff or a meaningful job offer always deserves a conversation with someone who knows your specific situation, a partner, a mentor, an experienced peer. Use the framework above to think clearly; then talk to a person. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Write your answers to the three decision questions", target_day: 3, verification_question: "Have you written down your answers to the three decision questions?" },
        { action_hint: "Talk to one person who knows your work about the decision", target_day: 7, verification_question: "Have you talked to one person who knows your work about this decision?" },
      ],
      prerequisite_outputs: null,
    },
  },

  31: {"id":31,"name":"Handling comparison anxiety when a peer announces something good","track":"F","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Resilience","trigger_phase":"Triggered by a peer's public announcement that lands hard","estimated_minutes":4,"output_type":"comparison_response","description":"The specific psychological move when someone in your network posts a win that lands harder than you expected. Why it happens, what the spike tells you, and the response that actually helps your work.","what_you_get":"The useful signal in the discomfort, what to send the peer in the next 24 hours, and the self-directed move for your own work.","questions":[{"id":"peer_proximity","text":"Was this peer in a path close to yours, or a different one entirely?","type":"choice","options":["Very close (similar archetype, similar stage)","Somewhat adjacent (similar industry, different path)","Different path entirely (a friend or former colleague in a different field)"]},{"id":"announcement_type","text":"What did they announce?","type":"choice","options":["A new job or promotion","A client win or new engagement","A book, podcast, or public visibility","A company milestone (sale, raise, exit)","General visibility (a popular post, a press mention)"]},{"id":"response_so_far","text":"What have you done in the hour since seeing it? (Optional)","type":"text","optional":true,"placeholder":"e.g. \"Closed the tab and felt deflated for the rest of the morning\""}],"output_structure":{"what_the_spike_tells_you":"The useful signal in the discomfort. A spike that lands hard usually points at something specific you want for yourself. Close-peer + similar-stage spikes are more useful than far-peer spikes because the proximity sharpens the signal. Use the proximity from Q1.","the_specific_response":"What to send the peer in the next 24 hours. A short, specific reply (\"the bit about X landed for me\") is more relationship-building than silence and more honest than performative enthusiasm. Match to the announcement_type from Q2.","the_self_directed_move":"What to do for your own work in the next 48 hours. The most common right move: write down the specific thing the announcement made you want, and the smallest move toward it you could make this week. Concrete, observable, single.","longer_view":"One sentence reframing what comparison does. The honest version: in a portfolio of moves, your peers' wins are also data points about what's possible. Used well, they update your model. Used badly, they shrink it.","caveat":"If the comparison spike is consistent across many peers over months, that's a different pattern worth looking at separately. This module is about the in-the-moment response, not the chronic loop."},
    module_addendum: {
      module_decision_frame: "User saw a peer's win that landed harder than expected (Q1 proximity: very close / somewhat adjacent / different path entirely), with announcement type (Q2: new job, client win, book/podcast/visibility, milestone, general visibility), and possibly a response so far (Q3 optional text). Produce the useful signal in the spike (close-peer spikes are more useful than far-peer spikes because proximity sharpens the signal), the specific response to send the peer in the next 24 hours (a short specific reply is more relationship-building than silence and more honest than performative enthusiasm), the self-directed move for your own work, and the longer view that peer wins are also data points about what is possible. The strong opinion: in a portfolio of moves, your peers' wins are also data points. Used well they update your model; used badly they shrink it.",
      module_specific_knowledge: `The structural pattern of comparison spikes. Comparison anxiety lands hardest when the peer is close (similar archetype, similar stage, similar choices) because the proximity removes the easy dismissals.

A win from someone in a very different field is easy to dismiss as not relevant, "they're doing something else; that's not my market." The spike is small.

A win from someone adjacent (same industry, different path) creates a moderate spike. They're in the same world but did something different; you can locate yourself relative to them.

A win from someone very close (similar archetype, similar stage, similar choices) creates the sharpest spike. The proximity removes the dismissals. You cannot say "they have a different network" or "they're in a different market" because they're in yours. The spike is the brain noting that the same path produced different outcomes and asking why.

The useful signal in the spike. Comparison spikes that land hard usually point at something specific you want for yourself but haven't named clearly. The work is to name it.

For a close peer announcing a new job at the seniority you'd want: the spike usually points at wanting that seniority and not having a clear path to it. The signal is to name the path.

For a close peer announcing a client win in your target market: the spike usually points at wanting visibility in that market and feeling you don't have it. The signal is to ask how they got the introduction or won the work.

For a close peer announcing a book or podcast: the spike usually points at wanting public visibility for your own thinking and not having shipped any. The signal is to start the smallest version.

For a close peer announcing a company milestone (raise, sale, exit): the spike usually points at wanting agency over the financial outcomes you're working toward. The signal is to look at your own runway and revenue trajectory and decide whether they're aligned with the outcomes you want.

For general visibility (popular post, press mention): the spike often points at the gap between the work you're doing and the visibility of that work. The signal is usually about distribution, not the work itself.

The specific response to the peer in 24 hours. A short specific reply works for three reasons: it builds the relationship; it normalises sending genuine reactions (which compounds); it forces you to name what specifically about their announcement is useful or impressive, which clarifies your own thinking.

The structure of the response: one sentence acknowledging the announcement specifically (not "congrats!" alone); one sentence naming what specifically struck you ("the bit about X resonated because Y"); one sentence opening continued conversation if the relationship is close.

Examples by announcement type.

For a new job: "Saw the news about [role at company]. The bit that landed for me was the specific scope you described, [specific detail from the post]. How did the conversation about [specific thing you're curious about] go?"

For a client win: "Great to see the [client name] engagement. The angle you took on [specific aspect] was interesting. Did you find them through [introducer / your own outreach / inbound]?"

For a book or podcast: "Picked up the book / listened to the episode. The [specific chapter / specific moment] was the strongest bit for me, particularly the framing of [specific point]. Sending it on to [specific other person who'd find it useful]."

For a milestone: "Great milestone. The journey from where you were 18 months ago to here is remarkable. Anything you'd advise the version of you at the start, given what you know now?"

For general visibility: "The [post / mention] was well-deserved. The distribution model you've been building seems to be paying off, what's working best?"

The wrong responses. Silence (the relationship cools). Generic "congrats!" (signals you didn't engage with the substance). Pivoting to your own work ("congrats on the new job! By the way I'm doing X...", reads as opportunistic). Performative enthusiasm that doesn't reference the specific announcement (reads as inauthentic).

The self-directed move. The 48-hour move for your own work. Write down: (1) the specific thing the announcement made you want; (2) the smallest move toward it you could make this week; (3) the move you'll actually take.

Most useful self-directed moves by announcement type.

Peer got a new role: identify one person in your network at a similar level of seniority and have a coffee conversation about path.

Peer got a client win: send one outreach message to a similar client type you've been postponing.

Peer published something: post one piece of writing this week, regardless of polish.

Peer hit a financial milestone: review your own financial plan with fresh eyes.

Peer got visibility: ship one piece of visible work this week (a post, a comment, a public conversation).

The longer view. Your peers' wins are data points about what is possible. When you use them well, they update your model of what you could do. When you use them badly, they shrink your sense of possibility into a comparison loop.

The discipline is to convert the spike into a specific named want and a specific smallest move, then move on. Holding the spike without converting it (rumination) is what damages the work. Converting it quickly is what makes peer wins generative rather than corrosive.

Chronic patterns. If comparison spikes are consistent across many peers over months, that's a different pattern than the in-the-moment spike addressed here. The chronic pattern usually responds well to: reducing the surface area of comparison (curating who you follow); examining what specifically you want and whether you're moving toward it; a coaching or therapeutic conversation about the underlying pattern.`,
      curated_caveat_base: "If comparison spikes are consistent across many peers over months, that is a chronic pattern rather than the in-the-moment spike addressed here. The chronic pattern often responds well to reducing the surface area of comparison (curating your feed), naming specifically what you want, and sometimes a coaching or therapeutic conversation about the underlying loop. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Send the specific response to the peer", target_day: 1, verification_question: "Have you sent a short specific response to the peer?" },
        { action_hint: "Write down the specific thing the announcement made you want", target_day: 2, verification_question: "Have you written down the specific thing you want for yourself and the smallest move toward it?" },
      ],
      prerequisite_outputs: null,
    },
  },

  32: {"id":32,"name":"Handling the partner or family conversation","track":"F","access_tier":"subscription","applicable_sectors":null,"prerequisite_module":null,"area":"Resilience","trigger_phase":"Triggered when the conversation is overdue or has gone badly","estimated_minutes":5,"output_type":"family_conversation_framework","description":"The conversation that often determines whether your plan survives the next 90 days. What to share, what not to share, and the specific structure that works for both sides.","what_you_get":"The specific framing of your plan to share, the over-share to avoid, a conversation structure matched to your dynamic, and an agreed follow-up cadence.","questions":[{"id":"conversation_status","text":"Have you had this conversation in any meaningful form yet?","type":"choice","options":["No, I've been avoiding it","Partial, I've mentioned things but not had a real conversation","Yes, recently, and it did not go well","Yes, recently, and it went okay but feels unresolved"]},{"id":"their_concern","text":"What is their primary concern?","type":"choice","options":["Income and financial security","Your wellbeing and stress","Specific timing (e.g. a family event coming up)","General risk and the unknown","I'm not sure what their primary concern is"]},{"id":"relationship_dynamic","text":"How do the two of you typically have hard conversations?","type":"choice","options":["Head-on, we both prefer directness","Over time, in small pieces","With structure (we plan and schedule them)","With some avoidance, they tend to drift"]}],"output_structure":{"what_to_share":"The specific framing of your plan that addresses their actual concern from Q2. Includes: the timeline you're working to, the financial picture (specific numbers, not vague reassurance), the signals that will tell both of you whether it's working, and what you would do if those signals don't show up.","what_not_to_share":"The over-share that makes it worse. Includes: every fluctuation in your daily mood, every speculative opportunity that hasn't landed yet, the imposter voice in real-time. Their job is not to absorb your day-to-day variance.","the_structure_that_works":"A specific way to have the conversation matched to their relationship_dynamic from Q3. For 'head-on': one focused sitting, clear ask at the start. For 'over time': three short conversations rather than one long one. For 'with structure': a written one-pager to read before talking. For 'with avoidance': a specific scheduled time with a soft anchor (a meal, a walk).","the_next_check_in":"What to agree on for follow-up. Specific cadence (e.g. monthly), specific signals to review (e.g. pipeline conversations, savings runway), and a pre-agreed trigger that prompts a bigger conversation (e.g. \"if we hit 4 months of runway with no revenue\").","caveat":"This is structure for a specific kind of working conversation. It is not a substitute for the deeper relationship conversations that may also need to happen. If the underlying dynamic is strained beyond the plan itself, that's a different piece of work."},
    module_addendum: {
      module_decision_frame: "User has a partner or family conversation that is overdue or has gone badly (Q1 status: avoiding / partial / went badly / okay but unresolved), the other person's primary concern (Q2: income, wellbeing, timing, general risk, unknown), and the relationship dynamic for hard conversations (Q3: head-on / over time / with structure / with avoidance). Produce what to share (the specific framing of the plan addressing their actual concern), what NOT to share (the over-share that makes it worse), the conversation structure matched to the relationship dynamic, and the follow-up cadence with named signals and a pre-agreed trigger for a bigger conversation. The strong opinion: their job is not to absorb your day-to-day variance. Front-loading the variance into the conversation is what makes it worse.",
      module_specific_knowledge: `The structural shape of this conversation. The partner or family conversation about independent work is harder than the work itself because it carries different stakes for each person.

For you: it's about your work, your trajectory, your daily reality.

For them: it's about household finances, household stability, their relationship to your wellbeing, and their own life affected by the choices you're making.

Both sets of stakes are valid. The conversation goes badly when one set tries to override the other.

What to share. The specific framing of your plan that addresses their actual concern from Q2.

If their primary concern is income and financial security: share the specific numbers. Current monthly burn rate; current savings runway in months; the revenue path with realistic timing (typical activation plan generates first revenue in months 2-4, hits replacement income in months 6-12, exceeds employed income in months 12-24, adjust to your situation); the trigger you'd act on if the timing doesn't hold (specific revenue number, specific runway threshold).

Avoid: vague reassurance ("it'll work out"); abstract optimism without numbers; speculative opportunities that haven't landed yet.

If their primary concern is your wellbeing and stress: share the structural rhythm of the work. How you're managing the harder weeks; the support you have (a coach, a peer group, a mentor); the signals that would tell you the stress was becoming damaging; what you'd do if those signals appeared.

Avoid: minimising the stress they've observed; making them responsible for managing your emotional state; turning the conversation into a venting session.

If their primary concern is specific timing (a family event, a financial commitment): share the timing within the plan. When the specific event needs the situation to be one way; the plausible state of your work at that point; the contingencies if the timing doesn't align.

Avoid: dismissing the timing as their problem; promising specific outcomes by specific dates you can't control.

If their primary concern is general risk and the unknown: share the structure of the bet. The downside (worst case: take a job at month X, having spent Y of savings); the upside (best case at the same horizon); the realistic middle case. Most general-risk concerns ease when the downside is named and bounded.

Avoid: trying to convince them the work is low-risk when it isn't; framing your risk tolerance as the standard they should also hold.

If you genuinely don't know what their primary concern is (Q2 selected "I'm not sure"): the first conversation needs to be about finding that out. Open with "I want to understand what specifically is on your mind about this. Then I'll share my thinking on it." Listen first, fully, before sharing your framing.

What NOT to share. The over-share that makes the conversation worse.

Daily mood variance. The bad weeks, the imposter spikes, the discouraging conversations. Their job is not to absorb your day-to-day variance. Share the structural rhythm; not the daily texture.

Speculative opportunities that haven't landed. The conversation about the proposal you're working on, the lead that might convert, the introduction you're hoping for. These create cycles of hope and disappointment for them that aren't matched to anything real. Share opportunities only when they have a definite shape (signed, contracted, or at least scheduled).

The imposter voice in real-time. Saying out loud "I'm not sure I can do this" puts the partner in the position of having to either reassure you (which they may not feel) or agree (which they may not want to). The imposter voice is best shared with a coach, mentor, peer group, or therapist; not with the person whose financial life is tied to your work.

The full reasoning behind every micro-decision. Decisions about positioning, pricing, which clients to pursue, whether to take this specific engagement. These are work decisions; sharing them in detail invites input from someone who may not have the work context, which often produces decisions you don't actually want.

The structure that works, matched to relationship dynamic.

For "head-on, both prefer directness": one focused sitting, 60-90 minutes, with a clear ask at the start. Format: "I want to walk you through where the work is, what I think comes next, and what I'm worried about. I'd like to hear what's on your mind first, then share mine, then talk about what we need from each other."

For "over time, in small pieces": three short conversations over 2-3 weeks rather than one long one. Don't try to cover everything in one session. Plant a topic; come back to it days later when both of you have had time to think.

For "with structure (we plan and schedule them)": a written one-pager to read before talking, then a scheduled conversation about it. The one-pager: current state in numbers; the next 90 days; the signals you'd act on. The conversation: their questions and concerns; agreed next steps.

For "with some avoidance, they tend to drift": a specific scheduled time with a soft anchor (a meal, a walk, a drive). The anchor reduces the formality and the avoidance both. Limit to 30-45 minutes; if it drifts, return to it in a few days.

The follow-up cadence. Whatever the conversation format, end with an agreed cadence for future check-ins.

Default for most relationships: monthly. Specific signals to review (pipeline conversations, savings runway, revenue if any). Specific date for the next check-in.

Pre-agreed trigger for a bigger conversation. The trigger should be a measurable threshold, not a feeling. Examples: "if we hit 4 months of runway with no revenue, we have a bigger conversation"; "if I haven't had a positive paid engagement signal by [date], we have a bigger conversation"; "if the work is affecting our [specific aspect of life], we have a bigger conversation".

The pre-agreed trigger does two things. First, it removes the ongoing low-level "should we be talking about this" tension by deferring it to a specific named moment. Second, it ensures the bigger conversation actually happens when warranted rather than being avoided indefinitely.

When the underlying dynamic is strained beyond the work conversation. If the relationship dynamic is meaningfully strained beyond the plan itself, the conversation about the work won't fix it. The work conversation may surface tensions that point at deeper issues. Naming this honestly to yourself is important; the structure above is for a working conversation about the plan, not for repairing a relationship that needs its own work.`,
      curated_caveat_base: "This is a framework for a specific kind of working conversation about the plan. It is not a substitute for the deeper relationship conversations that may also need to happen. If the underlying dynamic with the other person is strained beyond the plan itself, that is a different piece of work and may benefit from a couples therapist or relationship counsellor. Verified [DATE].",
      curated_caveat_verified_date: "2026-05-25",
      commitments_template: [
        { action_hint: "Schedule the conversation with the right structure for your dynamic", target_day: 7, verification_question: "Have you scheduled the conversation using the structure matched to your relationship dynamic?" },
        { action_hint: "Prepare what you will share and what you will not share", target_day: 7, verification_question: "Have you prepared the specific framing of the plan to share and the over-share to avoid?" },
        { action_hint: "Agree the follow-up cadence and the pre-agreed trigger", target_day: 7, verification_question: "Have you agreed a follow-up cadence and the specific trigger that would prompt a bigger conversation?" },
      ],
      prerequisite_outputs: null,
    },
  },
};
