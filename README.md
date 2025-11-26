# CapillaryAnnotator

## A web app for annotating capillaroscopy images.

***Important: this app is more than 99% vibe code (not counting the included packages and this README). This app was tested fairly thoroughly but not extensively. I have not completely reviewed this code from scratch. Use at your own risk!***

So anyway, this app was vibe coded in like 3 days (all done when I'm off work, of course) using Google Antigravity with Gemini 3 and Claude Sonnet 4.5 Thinking. We've been using a certain brand of capillaroscope along with its software, which did double duty as both image capturing software and image annotation software. Problem was, we only had one copy of the software, and the software itself was kind of rough around the edges in some respects. So I thought it might be fun to try to build an image annotation program from scratch. Turns out that Gemini 3 and Claude Sonnet 4.5 Thinking are both pretty good at coding simple apps like this.

### Usage

#### File browser and loop count tally

*Assumptions:* this app assumes that your folder structure is like this:
```
"12345678 Jane Doe 13-01-2025 12.34.56/"  <-- choose this directory in the app
                   |
                   -- (possibly more folders representing more examinations)
                   |
                   -- "12-03-2024 10.55/"
                              |
                              -- (image files)
```
In this case, the working directory (which you should choose in the app's file browser) is assumed to start with an 8-digit number string that corresponds to the patient's ID number. This number is used in the app display, as well as in the exported PDF file. Once you've selected a working directory, you can use the dropdown list to choose an examination to annotate. Each image in the selected examination can be selected by clicking on the thumbnail. The loop count for each image is tallied at the lower left box.

#### Tools

Annotation tools are located in the right panel. Before you start annotating, first you need to calibrate the image size, which may vary for different monitors. Once that's done, there are several tools for marking the morphology of each loop, as well as tools for stuff like hemorrhage and avascular areas. In addition to these, you can also place an assessment box (1 mm by 1 mm) to help you count loops. There is also a ruler: click once to place an endpoint, click a second time to place the other endpoint. Endpoints are draggable.

#### Export

Data can be exported as JSON (for each image), a PNG image (with annotations), or as a PDF containing annotated images created during this session.

**Windows users**: download this whole package and unzip it. Double-click the `START_SERVER.bat` batch file to activate the local web server. (I've included a [miniserve](https://github.com/svenstaro/miniserve) executable for your convenience, but you can use whatever server you want.) Navigate to [the app](http://localhost:8080) and you're good to go.

**Mac users**: download this whole package and unzip it. You can run a web server of your choice, or you can go ahead and use the HTTP server included with Python. I don't have a Mac, so I'm not familiar with what y'all use.

Feel free to open issues! (or use this as a base to code your own!)
