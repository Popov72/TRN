TRN
===

Tomb Raider Nostalgia - View levels and play cut scenes for old Tomb Raider games 1/2/3 (maybe 4 one day).

[Browse and view TR1/2/3 levels](http://www.evpopov.com)

Main keys are:
  * **Z/Q/S/D** to move into the level (**A/W/S/D** in QWERTY mode)
  * **SPACE** / **X** to go UP/DOWN
  * **Right mouse button** to take control of (and release) the rotation of the camera with the mouse
  * **ENTER** to show/hide the informational panels

Hit the **H** key to display an help panel that lists all the keys you can use.

Cutscenes are the levels with a <img src="http://www.evpopov.com/resources/movie.png" width="24px"/> icon after the level name.

You can browse local levels on your hard drive by browsing the **TRN.html** page.

Levels used in the web site linked above have been converted to a JSON format (used by threeJS) thanks to the **TRN.html** page (set the *makeJSON* variable to *true* in this page and browse it if you want to convert some TR levels to JSON format for your own use).

## Install
You can install the project locally (on your own computer) by doing these steps:
* Click on the **Clone or download** button in this page (see above) and download a zip archive of the project
* Uncompress this zip file on your computer (say in *c:\Projects\TRN*)
* Install Python on your computer if you not already have it. To check if you already have Python installed:
  * Start a command line (type **cmd** in the search input of Windows and hit ENTER)
  * Type **python** then ENTER: if you get an error message, you don't have Python installed. To install it:
    * Download the package from the [Python web site](https://www.python.org/downloads/)
    * Launch the installation.
    * **__Important__**: check the **Add Python 3.7 to PATH** checkbox that you can see at the bottom of the first screen! If you don't do it, you will have to put the Python path to the global **PATH** variable yourself
* Start Python has a simple HTTP server:
  * Start a command line (type **cmd** in the search input of Windows and hit ENTER)
  * Go to the directory where you installed TRN (for eg: **cd c:\Projects\TRN** + ENTER)
  * If your version of Python is 3.x or more, type:
    * **python -m http.server** + ENTER
  * else type:
    * **python -m SimpleHTTPServer** + ENTER
* In your browser, browse the url http://localhost:8000

Note that you can use any web server for this matter. I described how to use Python to do that, but if you have another web server already installed on your computer, go for it.

You can also use PHP in much the same way than Python to start a simple HTTP server: install PHP on your computer (if not already installed), then use the command **PHP -S localhost:8000** from the TRN directory to start a simple web server.

## Roadmap
- not too much, maybe TR4 support...

## Screenshots
Click on the picture to view the corresponding level.<br>
Note: you won't have sound in the cutscenes when clicking on the screenshots below. Use the [above link](http://www.evpopov.com) to play cutscenes with sound.

<a href="http://www.evpopov.com/TRN.html?trgame=TR1&level=tr1/level2&autostart=1"><img title="City of Vilcabamba" src="resources/TR1_big/level2.jpg"/></a>

<a href="http://www.evpopov.com/TRN.html?trgame=TR1&level=tr1/level10b&autostart=1"><img title="Atlantis" src="resources/TR1_big/level10b.jpg"/></a>

<a href="http://www.evpopov.com/TRN.html?trgame=TR1&level=tr1/cut4&autostart=1"><img title="Lara vs. Natla" src="resources/TR1_big/cut4.jpg"/></a>

<a href="http://www.evpopov.com/TRN.html?trgame=TR2&level=tr2/boat&autostart=1"><img title="Venice" src="resources/TR2_big/boat.jpg"/></a>

<a href="http://www.evpopov.com/TRN.html?trgame=TR2&level=tr2/xian&autostart=1"><img title="Dragon's Lair" src="resources/TR2_big/xian.jpg"/></a>

<a href="http://www.evpopov.com/TRN.html?trgame=TR2&level=tr2/cut3&autostart=1"><img title="Bartoli vs. Monk" src="resources/TR2_big/cut3.jpg"/></a>

<a href="http://www.evpopov.com/TRN.html?trgame=TR3&level=tr3/nevada&autostart=1"><img title="Nevada Desert" src="resources/TR3_big/nevada.jpg"/></a>

<a href="http://www.evpopov.com/TRN.html?trgame=TR3&level=tr3/city&autostart=1"><img title="Lost City of Tinnos" src="resources/TR3_big/city.jpg"/></a>

<a href="http://www.evpopov.com/TRN.html?trgame=TR3&level=tr3/cut2&autostart=1"><img title="Saved by the Bell" src="resources/TR3_big/cut2.jpg"/></a>
