import { generateDemoAudioFile } from "./demoTracks";

export interface ChartTrack {
  rank: number;
  title: string;
  artist: string;
  peak: number;
  weeksOnChart: number;
  genre: string;
  bpm: number;
  key: string;
  icon: string;
  presetStyle: "synthwave" | "lofi" | "pop";
  lyrics: string;
}

export const BILLBOARD_HOT_100: ChartTrack[] = [
  {
    rank: 1,
    title: "Cruel Summer",
    artist: "Taylor Swift",
    peak: 1,
    weeksOnChart: 42,
    genre: "Synthpop / Pop",
    bpm: 170,
    key: "A major",
    icon: "🔥",
    presetStyle: "pop",
    lyrics: `[Verse 1]
Fever dream high in the quiet of the night
You know that I caught it
Bad, bad boy, shiny toy with a price
You know that I bought it

[Pre-Chorus]
Killing me slow, out the window
I'm always waiting for you to be waiting below
Devils roll the dice, angels roll their eyes
What doesn't kill me makes me want you more

[Chorus]
And it's new, the shape of your body
It's blue, the feeling I've got
And it's ooh, whoa, oh
It's a cruel summer
It's cool, that's what I tell 'em
No rules in breakable heaven
But ooh, whoa, oh
It's a cruel summer with you

[Verse 2]
Hang your head low in the glow of the vending machine
I'm not dying
We say that we'll just screw it up in these trying times
We're not trying

[Pre-Chorus]
So cut the headlights, summer's a knife
I'm always waiting for you just to cut to the bone
Devils roll the dice, angels roll their eyes
And if I bleed, you'll be the last to know

[Chorus]
And it's new, the shape of your body
It's blue, the feeling I've got
And it's ooh, whoa, oh
It's a cruel summer
It's cool, that's what I tell 'em
No rules in breakable heaven
But ooh, whoa, oh
It's a cruel summer with you

[Bridge]
I'm drunk in the back of the car
And I cried like a baby coming home from the bar
Said, "I'm fine," but it wasn't true
I don't wanna keep secrets just to keep you
And I snuck in through the garden gate
Every night that summer just to seal my fate
And I screamed for whatever it's worth
"I love you," ain't that the worst thing you ever heard?
He looks up grinning like a devil

[Chorus]
And it's new, the shape of your body
It's blue, the feeling I've got
And it's ooh, whoa, oh
It's a cruel summer
It's cool, that's what I tell 'em
No rules in breakable heaven
But ooh, whoa, oh
It's a cruel summer with you

[Outro]
I'm drunk in the back of the car
And I cried like a baby coming home from the bar
Said, "I'm fine," but it wasn't true
I don't wanna keep secrets just to keep you
With you, with you
It's a cruel summer with you`,
  },
  {
    rank: 2,
    title: "Paint The Town Red",
    artist: "Doja Cat",
    peak: 1,
    weeksOnChart: 28,
    genre: "Hip Hop / Pop Rap",
    bpm: 100,
    key: "Bb minor",
    icon: "🩸",
    presetStyle: "synthwave",
    lyrics: `[Chorus]
Yeah, bitch, I said what I said
I'd rather be famous instead
I let all that get to my head
I don't care, I paint the town red
Bitch, I said what I said
I'd rather be famous instead
I let all that get to my head
I don't care, I paint the town red

[Verse 1]
Mm, she the devil, she a bad lil' bitch, she a rebel
She put her foot to the pedal, it'll take a whole lot for me to settle
I could stand out in the rain, never get wet
I could dance on a grave, never get checked
Walk in the room, whole place get wrecked
Put my name in the hall, write a whole big check
I don't need a feature, I don't need a friend
I'ma do it by myself until the very bitter end

[Pre-Chorus]
Said I got the heat, yeah, I got the glow
Everywhere I walk, everybody know
I don't do the drama, I just do the show
Count another million, watch the bankroll grow

[Chorus]
Yeah, bitch, I said what I said
I'd rather be famous instead
I let all that get to my head
I don't care, I paint the town red
Bitch, I said what I said
I'd rather be famous instead
I let all that get to my head
I don't care, I paint the town red

[Verse 2]
Walk up in the spot, everybody staring
I don't really care what the hell they wearing
I'm on ten, gotta keep it daring
Never share the spotlight, no time for sharing
Said I'm cold as ice, but I burn like flame
Every single person gonna know my name
Turn the lights down, step into the frame
Ain't nobody else who can play this game

[Chorus]
Yeah, bitch, I said what I said
I'd rather be famous instead
I let all that get to my head
I don't care, I paint the town red
Bitch, I said what I said
I'd rather be famous instead
I let all that get to my head
I don't care, I paint the town red

[Outro]
Paint it red, paint it red
Everything I wanted, yeah, I got instead
Paint the town red!`,
  },
  {
    rank: 3,
    title: "Blinding Lights",
    artist: "The Weeknd",
    peak: 1,
    weeksOnChart: 90,
    genre: "Synthwave / 80s Retro",
    bpm: 171,
    key: "F minor",
    icon: "⚡",
    presetStyle: "synthwave",
    lyrics: `[Intro]
Yeah

[Verse 1]
I've been tryna call
I've been on my own for long enough
Maybe you can show me how to love, maybe
I'm going through withdrawals
You don't even have to do too much
You can turn me on with just a touch, baby

[Pre-Chorus]
I look around and Sin City's cold and empty
No one's around to judge me
I can't see clearly when you're gone

[Chorus]
I said, ooh, I'm blinded by the lights
No, I can't sleep until I feel your touch
I said, ooh, I'm drowning in the night
Oh, when I'm like this, you're the one I trust
Hey, hey, hey

[Verse 2]
I'm running out of time
'Cause I can see the sun light up the sky
So I hit the road in overdrive, baby, oh

[Pre-Chorus]
The city's cold and empty
No one's around to judge me
I can't see clearly when you're gone

[Chorus]
I said, ooh, I'm blinded by the lights
No, I can't sleep until I feel your touch
I said, ooh, I'm drowning in the night
Oh, when I'm like this, you're the one I trust

[Bridge]
I'm just walking by to let you know
I could never say it on the phone
Will never let you go this time

[Chorus]
I said, ooh, I'm blinded by the lights
No, I can't sleep until I feel your touch
Hey, hey, hey
Hey, hey, hey

[Outro]
I said, ooh, I'm blinded by the lights
No, I can't sleep until I feel your touch`,
  },
  {
    rank: 4,
    title: "Flowers",
    artist: "Miley Cyrus",
    peak: 1,
    weeksOnChart: 36,
    genre: "Disco Pop / Funk",
    bpm: 118,
    key: "A minor",
    icon: "🌸",
    presetStyle: "pop",
    lyrics: `[Verse 1]
We were good, we were gold
Kinda dream that can't be sold
We were right 'til we weren't
Built a home and watched it burn

[Pre-Chorus]
Mm, I didn't wanna leave you, I didn't wanna lie
Started to cry, but then remembered I

[Chorus]
I can buy myself flowers
Write my name in the sand
Talk to myself for hours
Say things you don't understand
I can take myself dancing
And I can hold my own hand
Yeah, I can love me better than you can
Can love me better, I can love me better, baby
Can love me better, I can love me better, baby

[Verse 2]
Paint my nails cherry red
Match the roses that you left
No remorse, no regret
I forgive every word you said

[Pre-Chorus]
Ooh, I didn't wanna leave you, baby, I didn't wanna fight
Started to cry, but then remembered I

[Chorus]
I can buy myself flowers
Write my name in the sand
Talk to myself for hours
Say things you don't understand
I can take myself dancing
And I can hold my own hand
Yeah, I can love me better than you can
Can love me better, I can love me better, baby
Can love me better, I can love me better, baby

[Bridge]
I didn't wanna leave you, I didn't wanna fight
Started to cry, but then remembered I

[Chorus]
I can buy myself flowers
Write my name in the sand
Talk to myself for hours
Say things you don't understand
I can take myself dancing
And I can hold my own hand
Yeah, I can love me better than you can

[Outro]
Can love me better, I can love me better, baby
Can love me better, I can love me better, baby
Yeah, I can love me better than you can`,
  },
  {
    rank: 5,
    title: "Espresso",
    artist: "Sabrina Carpenter",
    peak: 1,
    weeksOnChart: 18,
    genre: "Pop / Disco",
    bpm: 104,
    key: "C major",
    icon: "☕",
    presetStyle: "pop",
    lyrics: `[Intro]
Now he's thinkin' 'bout me every night, oh
Is it that sweet? I guess so
Say you can't sleep, baby, I know
That's that me, espresso

[Verse 1]
Move it up, down, left, right, oh
Switch it up like Nintendo
Say you can't sleep, baby, I know
That's that me, espresso
I can't relate to desperation
My give-a-fucks are on vacation
And I got this one boy and he won't stop callin'
When they act like that, oh, it's so intoxicatin'

[Chorus]
Now he's thinkin' 'bout me every night, oh
Is it that sweet? I guess so
Say you can't sleep, baby, I know
That's that me, espresso
Move it up, down, left, right, oh
Switch it up like Nintendo
Say you can't sleep, baby, I know
That's that me, espresso

[Verse 2]
Holy shit, I'm cute, I know it
Soft skin, look at how I glow it
Walk in the room, I steal the show and
He wants a taste, I already know it
One shot, two shot, keep him awake
Dreaming 'bout me every single day

[Chorus]
Now he's thinkin' 'bout me every night, oh
Is it that sweet? I guess so
Say you can't sleep, baby, I know
That's that me, espresso
Move it up, down, left, right, oh
Switch it up like Nintendo
Say you can't sleep, baby, I know
That's that me, espresso

[Bridge]
Is it that sweet? I guess so
Is it that sweet? I guess so
Say you can't sleep, baby, I know
That's that me, espresso

[Outro]
Now he's thinkin' 'bout me every night
That's that me, espresso`,
  },
  {
    rank: 6,
    title: "Snooze",
    artist: "SZA",
    peak: 2,
    weeksOnChart: 52,
    genre: "R&B / Soul",
    bpm: 143,
    key: "Ab major",
    icon: "🌙",
    presetStyle: "lofi",
    lyrics: `[Intro]
Ooh, I think I know
I'll touch that fire for you

[Verse 1]
I'll touch that fire for you
I do that three, four times again, I testify for you
Told that lie, I'd kill that, cry for you
Walk that mile, roll that dice for you
Never catch me slipping, always ridin' with you
Put my heart right on the line, yeah, division with you
Ain't nobody ever made me feel the way you do

[Chorus]
I can't lose when I'm with you
How can I snooze and miss the moment?
You just too important
Nobody do body like you do
I can't lose when I'm with you
How can I snooze and miss the moment?
You just too important
Nobody do body like you do, yeah

[Verse 2]
In the dark, in the ride, on the road, yeah
Holding hands, yeah, you never let it go, yeah
Everything we started from the bottom, now we grow, yeah
Got me feeling like I never felt before, yeah
Put your arms around me, tell me that you'll stay
We don't gotta worry 'bout tomorrow anyway

[Chorus]
I can't lose when I'm with you
How can I snooze and miss the moment?
You just too important
Nobody do body like you do
I can't lose when I'm with you
How can I snooze and miss the moment?
You just too important
Nobody do body like you do

[Bridge]
Main one ridin', how you ride?
How you ride on a side?
Tell me that you love me, tell me that you're mine
Never snooze when you're right by my side

[Outro]
I can't lose when I'm with you
How can I snooze and miss the moment?
Nobody do body like you do`,
  },
  {
    rank: 7,
    title: "As It Was",
    artist: "Harry Styles",
    peak: 1,
    weeksOnChart: 61,
    genre: "Indie Pop / New Wave",
    bpm: 174,
    key: "A major",
    icon: "🎈",
    presetStyle: "pop",
    lyrics: `[Intro]
Come on, Harry, we wanna say goodnight to you

[Verse 1]
Hold on, ring into the tone
No one's coming home
Answer the phone, "Harry, you're no good alone
Why are you sitting at home on the floor?
What kind of pills are you on?"
Ring the bell and nobody's coming up
Light the fire and nobody's warming up

[Chorus]
You know it's not the same as it was
In this world, it's just us
You know it's not the same as it was
As it was, as it was
You know it's not the same

[Verse 2]
Answer the phone
"Harry, you're no good alone
Why are you sitting at home on the floor?
What kind of pills are you on?"
Your daddy lives by himself
He just wants to know that you're well, oh
Go home, get ahead, light-speed internet
I don't wanna talk about the way that it was

[Chorus]
You know it's not the same as it was
In this world, it's just us
You know it's not the same as it was
As it was, as it was
You know it's not the same

[Bridge]
Go home, get ahead, light-speed internet
I don't wanna talk about the way that it was
Leave America, two kids follow her
I don't wanna talk about who's doin' it first

[Chorus]
You know it's not the same as it was
In this world, it's just us
You know it's not the same as it was
As it was, as it was
You know it's not the same

[Outro]
As it was, as it was
You know it's not the same`,
  },
  {
    rank: 8,
    title: "Kill Bill",
    artist: "SZA",
    peak: 1,
    weeksOnChart: 48,
    genre: "R&B / Alt Pop",
    bpm: 145,
    key: "Bb minor",
    icon: "🔪",
    presetStyle: "lofi",
    lyrics: `[Verse 1]
I'm still a fan even though I was salty
Hate to see you with some other broad, know you happy
Hate to see you happy if I'm not the one driving
I'm so mature, I'm so mature
I'm so mature, I got me a therapist to tell me there's other men
I don't want none, I just want you
If I can't have you, no one should

[Chorus]
I might kill my ex, not the best idea
His new girlfriend's next, how'd I get here?
I might kill my ex, I still love him though
Rather be in jail than alone
I get the sense that it's a lost cause
I get the sense that you might really be in love with her
The reason I'm so with it, the reason I'm so with it

[Verse 2]
I'm so obsessive, I'm so aggressive
Tryna get my mind off it, but I'm progressive
Down the highway, driving all alone
Wondering if you're answering her on the phone
Keep your heart safe, keep your front door locked
'Cause you never know when I'm stepping on the block

[Chorus]
I might kill my ex, not the best idea
His new girlfriend's next, how'd I get here?
I might kill my ex, I still love him though
Rather be in jail than alone

[Bridge]
I did it all for love, I did it all on no drugs
I did it all of sober, I did it all for us, oh
I did it all for love, I did it all of no drugs
I did it all so sober, didn't you see me?

[Chorus]
I might kill my ex, not the best idea
His new girlfriend's next, how'd I get here?
I might kill my ex, I still love him though
Rather be in jail than alone

[Outro]
I just killed my ex, not the best idea
Killed his girlfriend next, how'd I get here?
I just killed my ex, I still love him though
Rather be in hell than alone`,
  },
  {
    rank: 9,
    title: "Save Your Tears",
    artist: "The Weeknd",
    peak: 1,
    weeksOnChart: 69,
    genre: "Synthpop / 80s",
    bpm: 118,
    key: "C major",
    icon: "💧",
    presetStyle: "synthwave",
    lyrics: `[Verse 1]
I saw you dancing in a crowded room
You look so happy when I'm not with you
But then you saw me, caught you by surprise
A single teardrop falling from your eye

[Pre-Chorus]
I don't know why I run away
I'll make you cry when I run away

[Chorus]
Take me back 'cause I wanna stay
Save your tears for another
Save your tears for another day
Save your tears for another day

[Verse 2]
Met you once under a Pisces moon
I kept my distance 'cause I know that you
Don't like when I get too attached to you
So I broke your heart like someone did to mine
And now you won't love me for a second time

[Pre-Chorus]
I don't know why I run away, oh, girl
Said I make you cry when I run away

[Chorus]
Girl, take me back 'cause I wanna stay
Save your tears for another
I realize that I'm much too late
And you deserve someone better
Save your tears for another day
Save your tears for another day

[Bridge]
(Save your tears for another day)
(Save your tears for another day)

[Chorus]
I don't know why I run away
I'll make you cry when I run away
Save your tears for another day
Ooh, yeah (Save your tears for another day)

[Outro]
Save your tears for another day
Save your tears for another day`,
  },
  {
    rank: 10,
    title: "Vampire",
    artist: "Olivia Rodrigo",
    peak: 1,
    weeksOnChart: 30,
    genre: "Pop Rock / Alt Pop",
    bpm: 138,
    key: "F major",
    icon: "🩸",
    presetStyle: "pop",
    lyrics: `[Verse 1]
Hate to give the satisfaction, asking how you're doing now
How's the castle built off people you pretend to care about?
Just what you wanted
Look at you, cool guy, you got it
I see the parties and the diamonds sometimes when I close my eyes
Six months of torture you sold as some forbidden paradise
I loved you truly
You gotta laugh at the stupidity

[Chorus]
'Cause girls your age know better
I made you feel so big, you made me feel so small
Look at you, cool guy, you had it all
Bloodsucker, fame fucker
Bleedin' me dry like a goddamn vampire!

[Verse 2]
You said it was true love, but wouldn't that be hard to find?
Gave you my best months, you left me crying and blind
You sunk your teeth into me, blood on your collar
Every single promise was just for a dollar

[Chorus]
'Cause girls your age know better
I made you feel so big, you made me feel so small
Look at you, cool guy, you had it all
Bloodsucker, fame fucker
Bleedin' me dry like a goddamn vampire!

[Bridge]
You built me up just to watch me fall
You took my heart and threw it against the wall
And everyone said I should've known
You're only happy when you're on a throne!

[Chorus]
Bloodsucker, fame fucker
Bleedin' me dry like a goddamn vampire!

[Outro]
Bleedin' me dry like a goddamn vampire`,
  },
];

/**
 * Loads a Billboard Chart track and generates a matching synthesized WAV audio stem.
 */
export async function loadChartTrackAudio(track: ChartTrack): Promise<{ file: File; track: ChartTrack }> {
  const file = await generateDemoAudioFile(track.presetStyle);
  return { file, track };
}
