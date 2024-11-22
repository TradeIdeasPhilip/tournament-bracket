# Tournament Bracket

This is part of an experiment.

I was playing with the idea of writing special effects the way I would on a webpage.
This is an interesting proof of concept.
It shows the limits and possibilities of working withing a web application.

There are a few tools and frameworks available for this task.
Manim is the best example.
People use it to make a lot of the types of videos liked I'd like to make.
But I was hoping to use TypeScript, HTML and CSS, mostly because I'm comfortable with those tools.

This project, like most the tools I've looked at, focuses on the canvas.
I can draw anything I like.
And the _drawing capabilities_ are almost _one-to-one_ the same as SVG.
This might be acceptable, but I'd love to use the _exact same_ tools and assets that I use on the web.

I'm still exploring ways to do this.

I think I can solve this by using different runtime than the browser.
If C# was still fresh in my brain, I'd create a simple C# wrapper around a chromium widget.
That would replace the browser to get around some issues.
I should be able to do something similar in Deno 2 or similar, just to have all TypeScript in my project.
Switching to a different runtime will give me the following:

- The ability to make a virtual window any size I want.
  - To match the size of the final video pixel per pixel.
- The ability to take a screenshot.
  - This is totally broken in a web application.
  - There is a way to stream realtime.
  - But I'd like to go faster or slower based only on how long it takes to draw things.
- Direct access to the filesystem.
  - So I don't have to keep confirming things interactively.
  - And so I don't have to dump everything into one directory.
