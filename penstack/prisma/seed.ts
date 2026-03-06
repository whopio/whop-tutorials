import { PrismaClient, PublicationCategory, PostVisibility } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ── Tiptap content helpers ───────────────────────────────

function tiptapDoc(...blocks: object[]) {
  return { type: "doc", content: blocks };
}

function heading(text: string, level = 2) {
  return {
    type: "heading",
    attrs: { level },
    content: [{ type: "text", text }],
  };
}

type InlineContent = string | { type: "text"; text: string; marks?: object[] };

function paragraph(...parts: InlineContent[]) {
  const content = parts.map((p) => {
    if (typeof p === "string") return { type: "text", text: p };
    return p;
  });
  return { type: "paragraph", content };
}

function bold(text: string) {
  return { type: "text", text, marks: [{ type: "bold" }] };
}

function italic(text: string) {
  return { type: "text", text, marks: [{ type: "italic" }] };
}

function blockquote(...blocks: object[]) {
  return { type: "blockquote", content: blocks };
}

function bulletList(...items: object[][]) {
  return {
    type: "bulletList",
    content: items.map((blocks) => ({
      type: "listItem",
      content: blocks,
    })),
  };
}

function orderedList(...items: object[][]) {
  return {
    type: "orderedList",
    content: items.map((blocks) => ({
      type: "listItem",
      content: blocks,
    })),
  };
}

function horizontalRule() {
  return { type: "horizontalRule" };
}

function paywallBreak() {
  return { type: "paywallBreak" };
}

// ── Demo writers ─────────────────────────────────────────

const DEMO_WRITERS = [
  // ─── 1. TECHNOLOGY ───────────────────────────────────────
  {
    handle: "broke-the-build",
    name: "Broke the Build",
    bio: "Software opinions from someone who has shipped too many bad deploys to be polite about it.",
    category: "TECHNOLOGY" as PublicationCategory,
    email: "nora@demo.penstack.dev",
    displayName: "Nora Trent",
    posts: [
      // TECH POST 1 — Opinion/hot take — ~700 words — FREE
      {
        title: "Your Config File Is a Lie",
        subtitle: "On the myth of zero-config tooling",
        visibility: "FREE" as PostVisibility,
        content: tiptapDoc(
          heading("Your Config File Is a Lie"),
          paragraph("Every six months, a new build tool promises you'll never write a config file again. And every six months, you end up writing one anyway. Sometimes two."),
          paragraph("I'm not here to dunk on any tool in particular. Okay, that's not entirely true. But the pattern is what bothers me more than any specific offender. The pitch goes: ", italic("smart defaults, convention over configuration, it just works."), " Then you try to do something slightly off the golden path — say, alias a directory, or swap a plugin — and suddenly you're reading a GitHub issue from 2023 where someone named tsx_wizard_42 explains that you need to eject, patch a loader, and pray."),
          heading("The problem isn't configuration", 3),
          paragraph("Configuration is fine. Configuration is how you tell a computer what you actually want instead of what someone in a San Francisco office assumed you wanted."),
          paragraph("The problem is ", bold("hidden"), " configuration. Defaults that live in source code you never see, buried three packages deep in node_modules. When those defaults match your needs, great. When they don't, you're reverse-engineering someone else's opinions about directory structure. That's worse than writing a config file. At least a config file is honest about what it is."),
          heading("Convention over configuration killed nuance", 3),
          paragraph("Rails popularized the phrase. And Rails got it mostly right — because Rails had ", italic("one"), " strong opinion about every decision. You put models here. Views there. Routes go in this file. Fine."),
          paragraph("But modern JS tooling tries to have it both ways. Convention over configuration! Also here are 200 plugins. Also you can override anything. Also if you override the wrong thing, nothing works and the error message says ", italic("\"Cannot resolve module.\""), " Good luck."),
          paragraph("What we actually need isn't fewer config files. It's config files that make sense. Small ones. Documented ones. Config files where you can read each line and understand what it does without opening four browser tabs."),
          horizontalRule(),
          paragraph("I keep a file in every project called ", bold("WHY.md"), " that explains the non-obvious config choices. Three lines per decision. It has saved me more time than any zero-config tool ever has."),
          paragraph("Write config files. Document them. Move on.")
        ),
      },
      // TECH POST 2 — Analytical deep-dive — ~1,200 words — FREE
      {
        title: "Servers Are Back and Nobody Wants to Admit It",
        subtitle: "The edge was a detour",
        visibility: "FREE" as PostVisibility,
        content: tiptapDoc(
          heading("Servers Are Back and Nobody Wants to Admit It"),
          paragraph("For about three years, the industry convinced itself that the future of web applications was running JavaScript at the edge. Every CDN node a tiny server. Compute pushed as close to the user as possible. Latency solved forever."),
          paragraph("It didn't work out like that."),
          heading("What the edge actually gives you", 3),
          paragraph("Edge computing is genuinely good for a narrow set of things. URL rewrites. Auth token validation. A/B test routing. Geolocation headers. Stuff that doesn't need a database, a cache, or any external service. For that class of work, edge functions are fast, cheap, and great."),
          paragraph("But that's not what people tried to do with them. People tried to run their entire backend at the edge. Full request handlers, database queries, API calls to third-party services — all crammed into a runtime with limited Node.js compatibility, cold-start penalties, and a 25-second execution limit. Then they were surprised when things broke in weird ways."),
          heading("The database problem nobody solved", 3),
          paragraph("Here's the thing nobody talks about at conferences. Your edge function runs in 30 regions. Your database runs in one. Maybe two if you've set up read replicas. Every request from an edge function still has to cross the internet to reach your database, and ", italic("that"), " round trip is almost always longer than the latency you saved by running at the edge."),
          paragraph("Connection pooling becomes a nightmare. Each edge instance needs its own database connection — or you need a connection proxy in front of your database — or you use an HTTP-based database driver that adds its own overhead. None of these solutions are bad, exactly. But they're all complexity you took on to solve a problem you may not have had."),
          paragraph("I ran benchmarks on a real app last year. Same codebase. One version on a single-region server with a colocated database. One version on an edge runtime with a database proxy. The single-region server was faster for every request that touched the database. ", bold("Every single one.")),
          heading("The serverless middle ground", 3),
          paragraph("Serverless functions in a single region — close to your database — give you most of what people actually wanted from the edge. Auto-scaling. No servers to manage. Pay-per-invocation pricing. And your database queries take 2ms instead of 80ms."),
          paragraph("There's nothing wrong with picking a region. Most of your users are probably in one or two geographic areas anyway. If you have genuine global traffic and latency-sensitive workloads, you can replicate your database. But start with one region and a benchmark. Don't start with a deployment architecture designed for problems you haven't measured."),
          heading("Why this matters right now", 3),
          paragraph("Frameworks are quietly walking this back. Server components run on the server, not the edge. New deployment defaults are shifting back to regional. The conference talks about edge-first architecture have dried up. Nobody's writing blog posts titled \"We Moved Everything to the Edge and It Was Amazing\" anymore."),
          paragraph("That's fine. The industry tries things. Some work, some don't. But we should be honest about what we learned instead of just moving on to the next thing."),
          paragraph("Run your code near your data. It's not exciting advice. It's correct.")
        ),
      },
      // TECH POST 3 — Personal essay + opinion — ~800 words — PAID
      {
        title: "I Mass-Deleted My GitHub Repos and Nothing Bad Happened",
        subtitle: "A cleaning that was overdue by about six years",
        visibility: "PAID" as PostVisibility,
        content: tiptapDoc(
          heading("I Mass-Deleted My GitHub Repos and Nothing Bad Happened"),
          paragraph("Last month I deleted 47 repositories from my GitHub account. Prototypes from 2019. Forks I never touched. Tutorial projects from conferences I don't remember attending. A CLI tool I wrote during a flight delay that somehow had three stars."),
          paragraph("I expected to feel something. Loss, maybe. Or anxiety — what if I need that code? I felt relief."),
          heading("Why we hoard repos", 3),
          paragraph("Developers treat GitHub profiles like digital identity. The green contribution graph. The repo count. The pinned projects. It's a résumé and a portfolio and a status symbol all at once. Deleting repos feels like deleting proof that you've done things."),
          paragraph("But most of those repos are noise. They're not portfolio pieces. Nobody's looking at them. They're the coding equivalent of keeping every receipt in a shoebox because ", italic("what if I need it for taxes?")),
          heading("The audit", 3),
          paragraph("I went through everything alphabetically. Three questions per repo:"),
          orderedList(
            [paragraph("Have I touched this in the last two years?")],
            [paragraph("Would I be embarrassed if a hiring manager read the code?")],
            [paragraph("Does anyone — including me — actually use this?")]
          ),
          paragraph("If the answer was no to all three, it got deleted. No archiving. No backup. Deleted. Some repos got a maybe on one question, and I kept those. But the bar was low and I still cut two-thirds of my account."),
          heading("What's left is better", 3),
          paragraph("My profile now has 19 repos. I can tell you what every one of them does. Three are active projects. Four are libraries I still maintain. The rest are reference implementations that I occasionally send to people."),
          paragraph("That's a profile. The 47 deleted repos were clutter. They made the signal harder to find."),
          horizontalRule(),
          paragraph("Sunk cost fallacy applies to code too. The time you spent writing it is gone whether you keep the repo or not. And code you wrote three years ago? If you needed to solve that problem today, you'd solve it differently. The old code isn't a resource. It is an artifact."),
          paragraph("Go delete some repos. You won't miss them.")
        ),
      },
      // TECH POST 4 — Contrarian piece — ~600 words — PREVIEW
      {
        title: "TypeScript Doesn't Prevent Bugs",
        subtitle: "Controversial opinion from someone who uses TypeScript every day",
        visibility: "PREVIEW" as PostVisibility,
        paywallIndex: 3,
        content: tiptapDoc(
          heading("TypeScript Doesn't Prevent Bugs"),
          paragraph("I use TypeScript in every project. I genuinely like it. And I think the claim that TypeScript ", italic("prevents bugs"), " is mostly wrong."),
          paragraph("TypeScript prevents a specific category of error: calling a function with the wrong argument type, accessing a property that doesn't exist, forgetting a case in a union. Those are real mistakes. They happen. TypeScript catches them at compile time instead of runtime. Good."),
          paragraph("But they're not the bugs that keep you up at night. The bugs that actually matter — broken business logic, race conditions, data corruption from an edge case nobody considered, off-by-one errors in pagination — TypeScript doesn't touch those. Not even a little."),
          paywallBreak(),
          heading("What TypeScript actually does", 3),
          paragraph("TypeScript is a communication tool. It is the best documentation format we have for JavaScript codebases. When I read a function signature with proper types, I know what it expects and what it returns. I don't have to read the implementation. I don't have to guess."),
          paragraph("That's the real value. Not bug prevention — ", bold("comprehension."), " Types make code readable to people who didn't write it. That matters far more on a team than catching the occasional null reference."),
          heading("The testing gap", 3),
          paragraph("Here's what concerns me. Teams adopt TypeScript and then write fewer tests. I've seen this happen three times at three different companies. The reasoning goes: well, it's typed now, so we know it works. No. You know it ", italic("compiles."), " Those are different things."),
          paragraph("The most dangerous bugs live in the gap between \"the types are correct\" and \"the program does what the user expects.\" TypeScript doesn't narrow that gap. Only tests and careful thinking narrow that gap."),
          paragraph("Use TypeScript. Like it. But don't confuse a type checker for a test suite.")
        ),
      },
    ],
  },
  // ─── 2. CULTURE ────────────────────────────────────────────
  {
    handle: "the-long-take",
    name: "The Long Take",
    bio: "Trying to figure out what the culture is doing and why, one overly long essay at a time.",
    category: "CULTURE" as PublicationCategory,
    email: "rowan@demo.penstack.dev",
    displayName: "Rowan Achebe",
    posts: [
      // CULTURE POST 1 — Essayistic think-piece — ~1,100 words — FREE
      {
        title: "The Problem with the Content Treadmill",
        subtitle: "Or: what gets lost when everything has to be weekly",
        visibility: "FREE" as PostVisibility,
        content: tiptapDoc(
          heading("The Problem with the Content Treadmill"),
          paragraph("I've been thinking about what happens to writing when it has to happen on a schedule. Not on a deadline — deadlines are fine, deadlines are a wall you can push against, they give shape to formlessness. I mean a ", italic("schedule."), " The expectation that something will arrive in the inbox every Tuesday at 9 AM, whether or not you have anything worth saying."),
          paragraph("I run this newsletter. I like running it. But sometimes Tuesday comes around and I sit at the desk and the honest thing would be to write: nothing happened this week that I have a real thought about. I don't have an angle. I don't have a take. I have some half-formed observations and a vague sense that I should revisit something I read last month. That's not an essay. That's a note to myself."),
          paragraph("Instead, what most people do — what I've done — is manufacture urgency. Find the peg. The news hook. The discourse. Something someone said on a podcast that I can react to. And that works, technically. You get the thing out the door. But you know it's thinner than what you're capable of when you actually have something to say."),
          heading("The consistency trap", 3),
          paragraph("Every guide to building a newsletter audience says the same thing. Be consistent. Post on a regular schedule. Train your readers to expect you. And I understand the logic — there's research about habit formation and brand recall and all of it. The advice isn't wrong, exactly. It's incomplete."),
          paragraph("Consistency without substance trains your readers to expect something, and then trains them to skim it. I subscribe to maybe 15 newsletters. The ones I actually read, the ones I stop what I'm doing and read — they're the ones where I know the writer only publishes when they've got something. There's a trust built into that irregularity. When the email arrives, it means something."),
          paragraph("The ones that hit my inbox every single week without fail? I've stopped opening most of them. Not because they're bad. Because I've internalized that they'll always be there, and \"always there\" feels like wallpaper."),
          heading("The economics push the other way", 3),
          paragraph("I get why writers resist this. If you're running a paid newsletter, your subscribers are paying monthly. Silence feels like theft. You took their money and gave them nothing this week. So you write the thing, even if the thing is filler."),
          paragraph("But I wonder if we're wrong about that. I wonder if the subscribers who stay longest, who actually value what you do, are the ones who'd rather get two great essays a month than four mediocre ones. Nobody cancels a subscription because a writer took a week off. People cancel because they stopped finding value, and filler erodes value faster than silence does."),
          blockquote(
            paragraph("The goal isn't to be in someone's inbox. The goal is to be worth opening.")
          ),
          paragraph("I'm going to try something. I'm going to publish when the thing is ready, not when the calendar says so. If that means two posts in a week sometimes and nothing for ten days other times, fine. I'd rather be uneven than polished-but-empty."),
          paragraph("We'll see if it works. Maybe I'll lose subscribers. Maybe the algorithm will punish me. I've been thinking about it for months, and I keep coming back to the same conclusion: the writing I'm proudest of was never the stuff I wrote because it was Tuesday.")
        ),
      },
      // CULTURE POST 2 — Media criticism/cultural analysis — ~1,300 words — PAID
      {
        title: "Everyone Is a Curator Now",
        subtitle: "On taste as currency and the death of the casual recommendation",
        visibility: "PAID" as PostVisibility,
        content: tiptapDoc(
          heading("Everyone Is a Curator Now"),
          paragraph("There's a thing that happens when someone asks what music you've been listening to, and instead of just answering, you freeze for a second and think about what the answer ", italic("says about you."), " Not whether you enjoyed it — whether it positions you correctly. Whether it's too obvious, too niche, too old, too new."),
          paragraph("I watched this happen in real time at a dinner party last month. Someone asked the table for book recommendations, and there was this visible recalibration behind people's eyes. Not ", italic("what have I read lately that was good,"), " but ", italic("what recommendation makes me seem like the kind of person I want to seem like.")),
          paragraph("That's curation. Not the act of choosing — the performance of choosing."),
          heading("How we got here", 3),
          paragraph("The internet turned taste into a public act. Your Spotify Wrapped is a social object. Your Letterboxd profile is a self-portrait. Your bookshelf in the background of a video call says more about you than what you actually said in the meeting. This has been true for a while, but I think we've crossed a threshold where the performance of taste is starting to replace the experience of taste."),
          paragraph("I mean something specific by that. When you choose a book because of what it signals — because it'll look right on a shelf, because it's the kind of thing that gets recommended in the right newsletters — you've substituted the question ", italic("will I enjoy this"), " with ", italic("will this improve my profile."), " And the insidious thing is you might not even notice you've done it, because the signaling part feels like genuine preference. The algorithm of self-presentation runs below consciousness."),
          heading("The Spotify problem", 3),
          paragraph("Spotify Wrapped is the clearest example. Once a year, your listening habits become content. People share them, compare them, feel validated or embarrassed by them. And because you know this is coming — because the year-end summary is a social event — it changes how you listen. Maybe not consciously. But the awareness is there."),
          paragraph("I've caught myself letting a song finish that I don't particularly like because skipping it would affect my stats. That is, to put it gently, insane. I'm performing taste for a spreadsheet that a corporation will eventually turn into an infographic that I'll share because other people are sharing theirs."),
          paragraph("But I did it. And I'm fairly self-aware about this stuff, which means a lot of people are doing it without noticing."),
          heading("The death of the casual recommendation", 3),
          paragraph("The part that actually bothers me is what this does to recommendations between friends. The casual ", italic("oh you should watch this, it's fun"), " — just genuinely liking a thing and wanting to share it — has been infected by the curator mindset. Now every recommendation is potentially a statement about your identity. And that makes people cautious."),
          paragraph("I miss being told to watch bad movies. I miss someone saying ", italic("this is terrible but I couldn't stop watching it"), " without the caveat being a performance of its own. The guilty pleasure used to be personal. Now it's a genre of content."),
          blockquote(
            paragraph("Every honest cultural exchange requires the willingness to look a little stupid. We're engineering that out.")
          ),
          horizontalRule(),
          paragraph("I don't have a solution to this, which is uncomfortable. Usually when I write these essays I like to land on something — a reframe, a suggestion, a way of seeing the problem that opens a door. This time I mostly just wanted to name it. The taste-as-identity loop. The curation performance. The way that making your preferences public changes the preferences themselves."),
          paragraph("Maybe noticing is enough for now. Maybe the next time someone asks what I've been reading, I'll just tell the truth, even if the truth is a thriller I bought in an airport.")
        ),
      },
      // CULTURE POST 3 — Reflective/personal — ~600 words — PREVIEW
      {
        title: "I Stopped Reading the Discourse",
        subtitle: "Three months without the timeline",
        visibility: "PREVIEW" as PostVisibility,
        paywallIndex: 3,
        content: tiptapDoc(
          heading("I Stopped Reading the Discourse"),
          paragraph("In November I decided to stop following discourse cycles. Not social media entirely — I still post occasionally, still respond to messages. What I cut out was the daily rhythm of: thing happens, takes emerge, counter-takes emerge, meta-takes about the takes emerge, everyone moves on, repeat."),
          paragraph("I didn't announce it. Announcing a social media detox is its own form of participation. I just stopped opening the apps in the morning. When I felt the pull — that itch to see what everyone is arguing about — I'd go make coffee or read whatever book was on the nightstand. The itch went away after about two weeks."),
          paragraph("Three months in, here's what I've noticed."),
          paywallBreak(),
          heading("My opinions got slower", 3),
          paragraph("This is the big one. I used to form opinions in real time. Something would happen and within an hour I'd have a position on it. That speed wasn't the result of clear thinking. It was the result of pattern-matching against my tribe's expected response. I knew what people like me were supposed to think about a given event, so I thought it, and it felt like my own thought."),
          paragraph("Now things happen and I don't have a take for days. Sometimes weeks. Sometimes never. And the ones I ", italic("do"), " form feel different — less reactive, more mine. I can actually trace why I believe them instead of just knowing that I do."),
          heading("I missed less than I expected", 3),
          paragraph("The fear was that I'd be out of the loop. That I'd show up to conversations and not know what anyone was talking about. In practice, the things that actually matter reach me anyway — through friends, through the newsletters I still read, through proximity. The stuff that doesn't reach me through those channels turns out to be the stuff that wouldn't have mattered to me a week later anyway."),
          paragraph("Most discourse is designed to feel urgent and isn't. That's the business model."),
          paragraph("I'm not going back to how it was. I'll probably re-engage with some of it eventually, on terms I choose. But the three months of quiet changed how I think about thinking, and I'd rather keep that than give it up for the sake of being current.")
        ),
      },
    ],
  },
  // ─── 3. ART ────────────────────────────────────────────────
  {
    handle: "raw-material",
    name: "Raw Material",
    bio: "Art seen up close. What it looks like, what it does, why it sticks with you or doesn't.",
    category: "ART" as PublicationCategory,
    email: "tomás@demo.penstack.dev",
    displayName: "Tomás Vega",
    posts: [
      // ART POST 1 — Gallery review/personal essay — ~1,000 words — FREE
      {
        title: "Standing in Front of a Rothko Until Something Happened",
        subtitle: "I went skeptical. I left different.",
        visibility: "FREE" as PostVisibility,
        content: tiptapDoc(
          heading("Standing in Front of a Rothko Until Something Happened"),
          paragraph("I didn't like Rothko for years. I understood the idea — large color fields, emotional immersion, transcendence, whatever. I'd seen reproductions in books and on screens and thought: these are rectangles. Nice colors. So what."),
          paragraph("Then someone told me you have to see them in person. Everyone says this about Rothko. It has the ring of a thing people say because other people say it. But I was at the museum anyway, so I went to the Rothko room and stood there."),
          paragraph("The painting was ", italic("No. 61 (Rust and Blue)."), " About six feet tall, four feet wide. Rust-red rectangle floating above a blue one, both on a red ground that bled into the edges like it was breathing. I looked at it and thought about how I should be feeling something."),
          paragraph("After about three minutes I almost left. Then I didn't."),
          heading("What happened", 3),
          paragraph("I can't describe it well, which is the point. The edges between the colors started to vibrate — not literally, I know they're pigment on canvas, but the boundary between rust and blue became uncertain. It pulsed. The painting seemed to get bigger, or I seemed to get smaller. My peripheral vision blurred and the color became spatial, like being inside weather."),
          paragraph("I stood there for maybe 20 minutes. I don't know exactly. I do know that when I stepped back, the room felt different. Smaller. Too bright. Like adjusting to daylight after a movie."),
          paragraph("I texted a friend: ", italic("okay fine, Rothko is a real thing."), " She sent back a row of laughing emojis because she'd told me so for years."),
          heading("What's actually going on", 3),
          paragraph("Rothko designed these to be seen up close, in low light, at a specific scale. The canvases are huge because he wanted them to envelope your visual field. The edges are soft because he wanted the colors to interact with each other and with your perception. He thinned his paint to translucency so light passes through and reflects off multiple layers, which gives the surface a glow that reproduction can't capture."),
          paragraph("He wasn't painting rectangles. He was engineering an optical experience. The paintings are devices for producing a specific perceptual state in a viewer. That sounds clinical but it didn't feel clinical. It felt like the painting was doing something to me that I hadn't agreed to."),
          paragraph("I've talked to people who had the same experience and people who stood in front of a Rothko for 30 minutes and felt nothing. I don't think either response is wrong. But I think the people who felt nothing might have been looking ", italic("at"), " the painting when the trick is to let the painting look at you. Stop analyzing. Let your eyes soften. Give it time."),
          horizontalRule(),
          paragraph("I've gone back twice. The second time I sat on the bench and watched other people encounter them. There's a moment you can see — this tiny shift in posture when someone stops examining and starts experiencing. Not everyone gets there. But when someone does, they stay."),
          paragraph("The rectangles are not the point. The rectangles are a delivery mechanism.")
        ),
      },
      // ART POST 2 — Visceral opinion piece/hot take — ~500 words — FREE
      {
        title: "Most Public Art Is Furniture",
        subtitle: "And we should stop pretending otherwise",
        visibility: "FREE" as PostVisibility,
        content: tiptapDoc(
          heading("Most Public Art Is Furniture"),
          paragraph("There's a stainless steel sculpture outside the new office tower on 5th. It's the kind of thing that looks like it was generated by committee, because it was. Vaguely organic curves. Polished to a mirror finish. No title, or a title like ", italic("Convergence"), " or ", italic("Nexus"), " or ", italic("Ascent"), " — one of those words that means nothing and offends no one."),
          paragraph("It's not art. It's a compliance object. A box checked on a development application. Many cities require public art as part of new construction — spend X percent of the budget on art — and what you get is decoration that satisfies a legal obligation without risking anything."),
          paragraph("I hated it on sight. Not because it was bad — ", italic("bad"), " would at least be interesting. I hated it because it was nothing. It occupied space without making a claim. You could walk past it a thousand times and never once be moved, challenged, or even mildly annoyed."),
          heading("What good public art does", 3),
          paragraph("Good public art makes you stop. Not because it's pretty — because it asserts something. Anish Kapoor's ", italic("Cloud Gate"), " in Chicago works because it warps your reflection and the skyline into something surreal. You interact with it. You see yourself distorted. It's playful and strange in a way that polished corporate sculpture never is."),
          paragraph("Maya Lin's Vietnam Veterans Memorial works because it's confrontational. A wound in the earth. A list of names. It refuses to be uplifting and it refuses to be decorative. You stand in front of it and feel the weight of specific human loss. That's what public art can do when someone with vision is allowed to have that vision."),
          paragraph("The steel blob outside the office tower doesn't do any of that. It fills a requirement. It matches the building's aesthetic. It is, functionally, a very expensive planter without the plants."),
          horizontalRule(),
          paragraph("I want public art that makes city council members uncomfortable. Art that generates at least one angry letter to the editor. Art that a kid points at and says ", italic("what is that."), " Not an answer — a question. If your public art installation doesn't produce a single confused or irritated reaction, you haven't installed art. You've installed furniture.")
        ),
      },
    ],
  },
  // ─── 4. TRAVEL ─────────────────────────────────────────────
  {
    handle: "off-the-route",
    name: "Off the Route",
    bio: "Travel writing about the parts they leave out of the guidebook. Mostly the weird parts.",
    category: "TRAVEL" as PublicationCategory,
    email: "mika@demo.penstack.dev",
    displayName: "Mika Sørensen",
    posts: [
      // TRAVEL POST 1 — Observational essay — ~1,000 words — FREE
      {
        title: "The Waiting Rooms of Southeast Asia",
        subtitle: "A love letter to the places between places",
        visibility: "FREE" as PostVisibility,
        content: tiptapDoc(
          heading("The Waiting Rooms of Southeast Asia"),
          paragraph("I've spent more time in bus stations in Southeast Asia than in any temple, market, or beach. This was not the plan. But plans and bus schedules in this part of the world have a casual relationship, and after a while you stop fighting it and start paying attention to where you actually are."),
          paragraph("Where I actually am, right now, is a bus depot outside Vientiane. There's a plastic chair that was green once. A woman selling grilled pork skewers from a cart that has one functional wheel. Three dogs of indeterminate breed lying in the shade of a minivan that may or may not be my ride. The departure time on my ticket says 10:00. It is 11:45. Nobody seems concerned."),
          heading("What you notice when you stop moving", 3),
          paragraph("Travel writing loves the destination. The arrival. The view from the summit. Nobody writes about the bus station because nothing happens there. Except everything happens there if you're actually watching."),
          paragraph("The woman with the pork skewers — she's running a business with a capital investment of one cart, one small grill, and a cooler of marinated meat. She makes the skewers right in front of you, fans the charcoal with a piece of cardboard, and charges about 40 cents for four. They are, without exaggeration, some of the best things I've eaten in this country. Smoky, sweet from palm sugar, a little charred at the tips. I've had worse food at restaurants that cost a hundred times more."),
          paragraph("A kid — maybe nine, maybe twelve, I'm bad with ages — is doing homework on the floor next to the ticket counter. Actual homework, in a notebook, with a pencil. He looks up every time a bus arrives, counts the passengers getting off, and goes back to his math. I have no idea why he's counting. I thought about asking but my Lao is limited to \"hello,\" \"thank you,\" and \"where is the bathroom.\""),
          heading("The rhythm of not-quite-waiting", 3),
          paragraph("There's a specific feeling to a Southeast Asian transit stop that I haven't experienced anywhere else. It's not the anxious waiting of a Western airport, where delays feel like personal offenses and everyone's checking a screen. It's closer to hanging out. People eat. Talk. Nap. The transition from waiting to traveling isn't sharp — the bus shows up and people sort of gradually get on it, there's a period where it's unclear if they're boarding or just standing near the door, and then at some point the driver starts the engine and you're moving."),
          paragraph("I've been in bus stations in Cambodia where chickens wandered through. Literal chickens. In a ferry terminal in the Philippines, I watched two men play chess on a board they'd drawn on the floor in marker. They'd clearly been playing in that exact spot for years because the floor was worn smooth around the game."),
          blockquote(
            paragraph("The spaces between destinations are where you actually see how a place works. Not the tourist version. The real daily texture of life in transit.")
          ),
          heading("Why this matters, if it does", 3),
          paragraph("I don't want to oversell this. A bus station is a bus station. It's not sacred. The plastic chairs are uncomfortable and the bathrooms range from acceptable to harrowing."),
          paragraph("But travel has this problem where we curate it into highlights. Temple. Sunset. Food shot. Repeat. The parts in between — the three hours on a plastic chair eating pork skewers while a kid does homework — get edited out because they don't photograph well. And I think that's a mistake, because those are the hours where you're not a tourist experiencing an attraction. You're just a person in a place, watching life happen at its own pace."),
          paragraph("The bus is here. I think it's mine. The driver is honking even though everyone can see him."),
          paragraph("Time to go.")
        ),
      },
      // TRAVEL POST 2 — Wry observation piece — ~800 words — PAID
      {
        title: "A Field Guide to Bad Hotel Wi-Fi",
        subtitle: "What the password situation tells you about a place",
        visibility: "PAID" as PostVisibility,
        content: tiptapDoc(
          heading("A Field Guide to Bad Hotel Wi-Fi"),
          paragraph("You can learn a lot about a hotel from its Wi-Fi. Not the speed — the entire situation. The password, the login process, the confidence with which they claim to offer it, and the gap between that confidence and reality."),
          paragraph("After years of budget travel and midrange hotels across four continents, I've developed a taxonomy."),
          heading("Type 1: The Handwritten Note", 3),
          paragraph("Password written on a scrap of paper at the front desk. Sometimes a Post-it. Sometimes the back of a business card. The password is always something like ", italic("welcome2024"), " or the hotel's name with a 1 after it. This hotel is honest. They have Wi-Fi. It mostly works. They're not pretending it's better than it is. Respect."),
          heading("Type 2: The Captive Portal", 3),
          paragraph("You connect to the network and a login page appears — or tries to appear. Half the time it doesn't load because the captive portal itself requires an internet connection that you don't have because you're not logged in yet. It's a Catch-22 built in HTML. You stare at a spinning wheel, try a different browser, clear your DNS cache, and eventually it loads a page asking for your room number and last name. You enter them correctly and it says ", italic("invalid credentials."), " You go to the front desk. They tell you to try again. It works the second time for reasons nobody will ever explain."),
          heading("Type 3: The Tiered System", 3),
          paragraph("Free Wi-Fi available! (For email only.) For video streaming, please upgrade to Premium Wi-Fi for $12.95/day."),
          paragraph("The free tier is dial-up cosplay. Loading a webpage with images takes 30 seconds. The premium tier is what the free tier should have been. You pay it because you need to work. You resent it because you're already paying for the room. This is most common at business hotels and airport hotels — places where they know you're trapped and will pay."),
          heading("Type 4: The Phantom Network", 3),
          paragraph("The booking page says Wi-Fi. The website says Wi-Fi. The sign at reception says Wi-Fi. You ask for the password and the person at the desk looks slightly panicked and makes a phone call. Eventually someone gives you a password for a network that has full bars and zero connectivity. Pages don't load. Speed tests time out. The Wi-Fi exists in the same way a mirage exists — technically visible, fundamentally not there."),
          paragraph("This one is most common in places where internet infrastructure is inconsistent and the hotel is reselling a residential connection that was already serving the owner's family, two other businesses, and a neighbor. I don't blame them. I'm still frustrated."),
          heading("Type 5: The Surprisingly Good", 3),
          paragraph("No login page. No password — or a simple one printed on the key card. You connect and you're online. Fast. Stable. You can video call without freezing. You can upload files. It just works."),
          paragraph("When this happens at a budget guesthouse in a small town, it feels like finding a $20 bill in your jacket pocket. Someone cared about this. Someone decided that working internet was important and made it happen. It's the hospitality equivalent of a firm handshake — a small thing that tells you the person running the place pays attention."),
          horizontalRule(),
          paragraph("I've stayed at five-star hotels with Type 4 Wi-Fi and $15 guesthouses with Type 5. The correlation between hotel price and internet quality is approximately zero. If anything, the fancier the lobby, the worse the odds. I have no explanation for this. It might be one of those universal truths that resists analysis."),
          paragraph("Check the reviews for Wi-Fi complaints before you book. It won't be in the hotel description. It's always in the reviews.")
        ),
      },
    ],
  },
];

// ── Main seed function ───────────────────────────────────

async function main() {
  console.log("Seeding demo data...\n");

  const createdUsers: { id: string; writerId: string }[] = [];

  for (const writerData of DEMO_WRITERS) {
    // Create user
    const user = await prisma.user.create({
      data: {
        whopUserId: `demo_${writerData.handle}`,
        email: writerData.email,
        displayName: writerData.displayName,
        username: writerData.handle,
        avatarUrl: null,
      },
    });

    // Create writer
    const writer = await prisma.writer.create({
      data: {
        userId: user.id,
        handle: writerData.handle,
        name: writerData.name,
        bio: writerData.bio,
        category: writerData.category,
        kycCompleted: true,
        monthlyPriceInCents: 500 + Math.floor(Math.random() * 1500),
        chatPublic: Math.random() > 0.3,
      },
    });

    createdUsers.push({ id: user.id, writerId: writer.id });

    // Create posts
    for (const postData of writerData.posts) {
      const slug = postData.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      await prisma.post.create({
        data: {
          writerId: writer.id,
          title: postData.title,
          subtitle: postData.subtitle,
          slug,
          content: postData.content,
          visibility: postData.visibility,
          paywallIndex: postData.paywallIndex,
          published: true,
          publishedAt: new Date(
            Date.now() - Math.floor(Math.random() * 14 * 24 * 60 * 60 * 1000)
          ),
          viewCount: Math.floor(Math.random() * 500) + 50,
        },
      });
    }

    console.log(`  Created writer: ${writerData.name} (@${writerData.handle})`);
  }

  // Create cross-follows and likes
  console.log("\n  Adding follows and likes...");

  for (let i = 0; i < createdUsers.length; i++) {
    for (let j = 0; j < createdUsers.length; j++) {
      if (i === j) continue;
      // Each user follows ~60% of other writers
      if (Math.random() < 0.6) {
        await prisma.follow.create({
          data: {
            userId: createdUsers[i].id,
            writerId: createdUsers[j].writerId,
          },
        });
      }
    }
  }

  // Add some likes
  const allPosts = await prisma.post.findMany({ select: { id: true } });
  for (const user of createdUsers) {
    for (const post of allPosts) {
      if (Math.random() < 0.4) {
        await prisma.like.create({
          data: { userId: user.id, postId: post.id },
        });
      }
    }
  }

  console.log("\nDone! Demo data seeded successfully.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
