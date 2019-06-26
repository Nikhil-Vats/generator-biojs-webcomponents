"use strict";
const Generator = require("yeoman-generator");
const chalk = require("chalk");
const yosay = require("yosay");
const validators = require("./validator");

module.exports = class extends Generator {
  initializing() {
    this.composeWith(require.resolve("generator-license"), {
      defaultLicense: "MIT" // (optional) Select a default license
    });
  }

  async prompting() {
    // Have Yeoman greet the user.
    this.log(
      yosay(
        `Welcome to the laudable ${chalk.red(
          "generator-biojs-webcomponents"
        )} generator!`
      )
    );

    // First prompt
    const initialPrompts = [
      {
        type: "list",
        name: "upgradeOrMake",
        message: "What do you want to do today?",
        choices: [
          "Upgrade an existing component to a Web Component",
          "Make a new Web Component"
        ],
        default: 0
      }
    ];

    // Secondary prompts if user chooses to upgrade an existing component to Web component.
    const upgradeComponentPrompts = [
      {
        type: "rawlist",
        name: "importFrom",
        message:
          "We need the build file (generally index.js, main.js or componentName.js) for this, import it using one of the options -",
        choices: [
          "Tell us the path of the file on your local machine and we will import it in the project.",
          "Tell us the npm package name, version, etc. and we will import it."
        ],
        default: 0
      }
    ];

    // Prompts if user chooses to import file(s) using npm
    const npmPrompts = [
      {
        type: "input",
        name: "packageName",
        message: "Enter the package name (case sensitive).",
        validate: validators.packageName
      },
      {
        type: "confirm",
        name: "confirmPackageName",
        message: "Press enter if the package description shown is correct."
      },
      {
        type: "rawlist",
        name: "changeImportSource",
        message: "What do you want to do?",
        choices: [
          "Enter package name again.",
          "Import the file locally from your computer."
        ],
        when: function(responses) {
          if (responses.confirmPackageName) {
            return false; // Don't show this prompt, if user says that package description is correct.
          }

          return true; // Show this prompt if user says that package description is not correct.
        }
      },
      {
        type: "input",
        name: "version",
        message:
          "Great! We will import the latest version of your file from the npm package, if you don't want this, enter the version.",
        default: "latest",
        when: function(responses) {
          if (responses.confirmPackageName) {
            return true; // Show this prompt if user says that package description is correct
          }

          return false; // Don't show this prompt if user says that package description is incorrect
        },
        validate: validators.version
      },
      {
        type: "input",
        name: "importBuildFileFromNPM",
        message: function(answers) {
          return (
            "This URL - " +
            chalk.bold.yellow(
              "https://www.jsdelivr.com/package/npm/" +
                answers.packageName +
                "?version=" +
                answers.version
            ) +
            " contains the directory of the package, please find the build file (generally in the dist or build folder) and paste the link here, we will download it for you."
          );
        },
        when: function(responses) {
          if (responses.confirmPackageName) {
            return true; // Show this prompt if user says that package description is correct
          }

          return false; // Don't show this prompt if user says that package description is incorrect
        },
        validate: validators.importBuildFileFromNPM
      },
      {
        type: "input",
        name: "copyBuildFileFromNPM",
        message: function(answers) {
          return (
            "This URL - " +
            chalk.bold.yellow(
              "https://www.jsdelivr.com/package/npm/" +
                answers.packageName +
                "?version=" +
                answers.version
            ) +
            " contains the directory of the package, please find the build file (generally in the dist or build folder) and paste the link here, we will download it for you in the existing folder."
          );
        },
        when: function(responses) {
          if (responses.importBuildFileFromNPM === "skip") {
            return true; // Show this prompt if user says that package description is correct
          }

          return false; // Don't show this prompt if user says that package description is incorrect
        },
        validate: validators.copyBuildFileFromNPM
      }
    ];

    // Prompt(s) if user chooses to import files locally from computer
    const localPrompts = [
      {
        type: "input",
        name: "importBuildFileLocally",
        message: "Please enter the path of the build file.",
        validate: validators.importBuildFileLocally
      },
      {
        type: "input",
        name: "copyBuildFileLocally",
        message:
          "Please enter the path of the build file, we will paste it into the existing directory.",
        when: function(responses) {
          if (responses.importBuildFileLocally === "skip") {
            return true; // Show this prompt if user says that package description is correct
          }

          return false; // Don't show this prompt if user says that package description is incorrect
        },
        validate: validators.copyBuildFileLocally
      }
    ];

    // Secondary prompts is user chooses to make a new component and final prompts if user chooses to upgrade an existing component
    const commonPrompts = [
      {
        type: "input",
        name: "toolNameComputer",
        message:
          "Computer package name? This is a computer name with NO capital letters or special characters apart from the hyphen ( - ) .",
        validate: validators.toolNameComputer,
        default: "biojs-webcomponent-tool-name-here"
      },
      {
        type: "input",
        name: "toolNameHuman",
        message:
          'Thanks! Now, give me a human name for the project with only letters and NO special characters apart from the whitespace (space). e.g. "Genome Browser"',
        validate: validators.toolNameHuman,
        default: "BioJS component"
      }
    ];

    /** Interacts with the user using prompts
     * Recursive so that user can go to a previous step and/or change method of importing file
     * @param {string} repeatLocalOrNpmPrompts tells the generator which prompts should be shown again (localPrompts or npmPrompts)
     * @returns {Promise} to execute prompts and wait for there execution to finish
     */
    const recursivePromptExecution = repeatLocalOrNpmPrompts => {
      // If user changes the method of importing later, recursive execution
      if (repeatLocalOrNpmPrompts) {
        // If user chooses to enter package name again when package description is incorrect
        if (repeatLocalOrNpmPrompts === npmPrompts[2].choices[0]) {
          return this.prompt(npmPrompts).then(props => {
            // If user chooses to go back and choose source of importing file again
            if (props.changeImportSource) {
              return recursivePromptExecution(props.changeImportSource); // Call the function recursively
            }

            // If user chooses to import from npm after starting over
            return this.prompt(commonPrompts).then(props => {
              this.props = props;
              this.props.toolNameCamel = toCamelCase(props.toolNameHuman);
            });
          });
        }

        // If user chooses to import file locally when package description is incorrect
        return this.prompt(localPrompts).then(() => {
          return this.prompt(commonPrompts).then(props => {
            this.props = props;
            this.props.toolNameCamel = toCamelCase(props.toolNameHuman);
          });
        });
      }

      // Normal (initial) prompt execution
      return this.prompt(initialPrompts).then(props => {
        // To access props later use this.props.someAnswer;
        // If user chooses to upgrade an existing component
        if (props.upgradeOrMake === initialPrompts[0].choices[0]) {
          return this.prompt(upgradeComponentPrompts).then(props => {
            // If user chooses to import file locally from computer
            if (props.importFrom === upgradeComponentPrompts[0].choices[0]) {
              return this.prompt(localPrompts).then(() => {
                return this.prompt(commonPrompts).then(props => {
                  this.props = props;
                  this.props.toolNameCamel = toCamelCase(props.toolNameHuman);
                });
              });
            }

            // If user chooses to import file from npm
            return this.prompt(npmPrompts).then(props => {
              // If user chooses to go back and choose source of importing file again
              if (props.changeImportSource) {
                return recursivePromptExecution(props.changeImportSource); // Call the function recursively
              }

              // If user chooses to import from npm initially
              return this.prompt(commonPrompts).then(props => {
                this.props = props;
                this.props.toolNameCamel = toCamelCase(props.toolNameHuman);
              });
            });
          });
        }

        // If user chooses to make a new component
        if (props.upgradeOrMake === initialPrompts[0].choices[1]) {
          return this.prompt(commonPrompts).then(props => {
            this.props = props;
            this.props.toolNameCamel = toCamelCase(props.toolNameHuman);
          });
        }
      });
    };

    await recursivePromptExecution(); // Wait for the function execution to finish
  }

  writing() {
    this.fs.copyTpl(
      this.templatePath("examples/index.html"),
      this.destinationPath("examples/index.html"),
      {
        title: this.props.toolNameHuman,
        toolNameComputer: this.props.toolNameComputer
      }
    );
    this.fs.copyTpl(
      this.templatePath("index.html"),
      this.destinationPath("index.html"),
      {
        title: this.props.toolNameHuman,
        toolNameComputer: this.props.toolNameComputer
      }
    );
    this.fs.copyTpl(
      this.templatePath("webpack.config.js"),
      this.destinationPath("webpack.config.js"),
      {
        toolNameCamel: this.props.toolNameCamel
      }
    );

    this.fs.copyTpl(
      this.templatePath("package.json"),
      this.destinationPath("package.json"),
      {
        author: this.props.author,
        homepage: this.props.homepage,
        toolNameHuman: this.props.toolNameHuman,
        toolNameComputer: this.props.toolNameComputer,
        licence: this.props.licence
      }
    );

    this.fs.copyTpl(
      this.templatePath("README.md"),
      this.destinationPath("README.md"),
      {
        author: this.props.author,
        toolNameHuman: this.props.toolNameHuman,
        toolNameComputer: this.props.toolNameComputer,
        licence: this.props.licence
      }
    );

    this.fs.copyTpl(
      this.templatePath("src/style.less"),
      this.destinationPath("src/style.less"),
      {
        toolNameCamel: this.props.toolNameCamel
      }
    );

    this.fs.copyTpl(
      this.templatePath("src/index.js"),
      this.destinationPath("src/index.js"),
      {
        toolNameComputer: this.props.toolNameComputer,
        toolNameCamel: this.props.toolNameCamel
      }
    );

    this.fs.copyTpl(
      this.templatePath("dev/serve.js"),
      this.destinationPath("dev/serve.js")
    );

    this.fs.copyTpl(
      this.templatePath("_gitignore"),
      this.destinationPath(".gitignore")
    );

    this.fs.copyTpl(
      this.templatePath("TODO.md"),
      this.destinationPath("TODO.md")
    );

    this.fs.copyTpl(
      this.templatePath("img/favicon.png"),
      this.destinationPath("img/favicon.png")
    );
  }

  install() {
    this.installDependencies({
      npm: true,
      bower: false,
      yarn: false
    });
  }
};

/**
 * Converts human friendly strings to camelcased space-free strings
 * @param {string} aString a prop taken in by yeoman's wizard
 * @return {aString}, but with spaces removed and camelCased.
 **/
function toCamelCase(aString) {
  var tokens = aString.split(" ");

  var camelString = "";
  tokens.map(function(token, index) {
    if (token.trim() !== "") {
      // Remove extra space between the words
      if (index) {
        camelString += token[0].toUpperCase(); // Capitalize the first letter of other words
      } else {
        camelString += token[0]; // Keep the first letter of the first word as it is
      }
    }

    camelString += token.substring(1, token.length);
    return true;
  });
  return camelString;
}
