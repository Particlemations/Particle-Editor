<h1>Particle Editor is a Fork of wick editor - Official Wick editor: https://github.com/Wicklets</h1>
<h1 align="center">
  <br>
  <a href="https://editor.wickeditor.com/"><img src=".github/images/logo.svg" alt="Wick Editor" width="25%"></a>
  <br>
</h1>

<p align="center">
  <a href="https://github.com/Wicklets/wick-editor/issues">
      <img src="https://img.shields.io/badge/contributions-welcome-orange.svg"/>
  </a>
  <a href="https://www.patreon.com/WickEditor">
      <img src="https://img.shields.io/badge/$-donate-ff69b4.svg?maxAge=2592000&amp;style=flat"/>
  </a>
  <a href="LICENSE.md">
    <img src="https://img.shields.io/badge/License-GPLv3-blue.svg"/>
  </a>
  <a href="https://twitter.com/wickeditor?ref_src=twsrc%5Etfw">
    <img src="https://img.shields.io/twitter/follow/wickeditor?style=social&logo=twitter" alt="follow on Twitter"></a>
</p>

<h1>Particle Editor</h1>

The Wick Editor is a free and open-source tool for creating games, animations, and everything in-between. It's designed to be the most accessible tool for creating multimedia projects on the web.

<p align="center"><img width="100%" src=".github/images/editor.svg"></p>

## Getting started

These instructions are for MacOS and Linux, we currently don't have instructions for Windows, but if you need help, please contact upstream!

### Requirements

You'll need to download the following:

- [NodeJS 14](https://nodejs.org/en/download) (**NOTE: This is a ancient version of NodeJS, from the ancient times**)
- [NodeJS 14 from `scoop`](https://scoop.sh/#/apps?q=nodejs14&id=ad5eddce0b1705a4141b06f972d326a2aaf03d4c) (Great package manager for people who don't wanna install stuff using wonky installers)
### Installation

1) Clone this repository:

    ```bash
    git clone https://github.com/StickmanRed/wick-editor.git
    ```

2) Using the command line, change directories into the newly created `wick-editor` folder:

    ```bash
    cd wick-editor
    ```

3) Install all dependencies using this command:

    ```bash
    npm install
    ```

### Running the Editor

1) Run the editor with this command:

    ```bash
    npm start
    ```

2) Open a web browser and go to this URL:

    ```bash
    localhost:3000
    ```
    (**NOTE: It may open up itself once `npm start` is ran**).

Have fun hacking on Wick! 🎉

### Deploying to Production

To deploy, you'll need to have push access to this repo.

1) Test the production build by using `npm predeploy`

2) Run `npm run deploy`

### Deploying to Prerelease

1) Run `npm run prerelease-deploy`

## Support

<a href="https://www.patreon.com/WickEditor">
	<img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="160">
</a>

## License

Wick Editor is under the GNU v3 Public License. See the [LICENSE](LICENSE.md) for more information.

## Links

* [Wick Editor Site](https://www.wickeditor.com) (**NOT OWENED BY FORKERS**)
* [Wick Editor Community Forum](https://forum.wickeditor.com/) (**Nice place, but, NOT OWENED BY FORKERS**)
* [Follow on Twitter](https://twitter.com/wickeditor) (**NOT OWENED BY FORKERS**)
* [Follow on Facebook](https://www.facebook.com/wickeditor/) (**NOT OWENED BY FORKERS**)



## Building and Releasing the Desktop App 

Please refer to this Wiki entry for information on our desktop build processes! [https://github.com/Wicklets/wick-editor/wiki/Building-Desktop-Editors-for-Release](https://github.com/Wicklets/wick-editor/wiki/Building-Desktop-Editors-for-Release). (**NOTE: We don't actually build these, old electron is a finicky mess**).

If you are familiar with electron-builder, electron-packager, or have experience building desktop electron apps for production, we could use your help! Please message us or open an issue.

## Contributors
<a href="https://github.com/StickmanRed/wick-editor/graphs/contributors">
	<img src = "https://contrib.rocks/image?repo=StickmanRed/wick-editor"/>
</a>
