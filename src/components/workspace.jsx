"use strict";

var React = require('react/addons');
var update = React.addons.update;
var _ = require('lodash');

var Editor = require('./editor.jsx');
var Output = require('./output.jsx');
var Toolbar = require('./toolbar.jsx');
var Validations = require('../validations');
var Storage = require('../services/storage');
var config = require('../config.js');

var Workspace = React.createClass({
  getInitialState: function() {
    return _.assign(config.defaults, {
      storageKey: this.generateStorageKey()
    });
  },

  componentDidMount: function() {
    Storage.load().then(function(payload) {
      if (payload !== undefined) {
        this.setState({
          storageKey: payload.key,
          sources: payload.data.sources,
          enabledLibraries: payload.data.enabledLibraries
        });
      }
    }.bind(this));
  },

  componentWillUpdate: function(_nextProps, nextState) {
    var anyChanged = false;

    for (var language in nextState.sources) {
      if (this.state.sources[language] !== nextState.sources[language]) {
        this.validateInput(
          language,
          nextState.sources[language],
          nextState.enabledLibraries);

        anyChanged = true;
      }
    }

    if (anyChanged ||
        this.state.enabledLibraries < nextState.enabledLibraries ||
        this.state.enabledLibraries > nextState.enabledLibraries) {

      Storage.save(
        nextState.storageKey,
        {
          sources: nextState.sources,
          enabledLibraries: nextState.enabledLibraries
        }
      );
    }
  },

  setSource: function(language, source) {
    var updateCommand = {sources: {}};
    updateCommand.sources[language] = {$set: source};

    this.setState(function(oldState) {
      return update(oldState, updateCommand);
    });
  },

  validateInput: function(language, source, enabledLibraries) {
    var validate = Validations[language];
    validate(source, enabledLibraries).then(function(errors) {
      var updateCommand = {errors: {}};
      updateCommand.errors[language] = {$set: errors};
      this.setState(function(oldState) {
        return update(oldState, updateCommand);
      });
    }.bind(this));
  },

  onErrorClicked: function(language, line, column) {
    var editor = this.refs[language + 'Editor'];
    editor.jumpToLine(line, column);
  },

  generateStorageKey: function() {
    var date = new Date();
    return (date.getTime() * 1000 + date.getMilliseconds()).toString();
  },

  render: function() {
    return (
      <div id="workspace">
        <Toolbar
          enabledLibraries={this.state.enabledLibraries}
          onLibraryToggled={this._onLibraryToggled} />

        <Output
          sources={this.state.sources}
          errors={this.state.errors}
          enabledLibraries={this.state.enabledLibraries}
          onErrorClicked={this.onErrorClicked} />

        <Editor
          language="html"
          source={this.state.sources.html}
          errors={this.state.errors.html}
          onChange={this.setSource} />

        <Editor
          language="css"
          source={this.state.sources.css}
          errors={this.state.errors.css}
          onChange={this.setSource} />

        <Editor
          language="javascript"
          source={this.state.sources.javascript}
          errors={this.state.errors.javascript}
          onChange={this.setSource} />
      </div>
    )
  },

  _onLibraryToggled: function(libraryKey) {
    this.setState(function(oldState) {
      var libraryIndex = oldState.enabledLibraries.indexOf(libraryKey);
      if (libraryIndex !== -1) {
        return update(oldState, {
          enabledLibraries: {$splice: [[libraryIndex, 1]]}
        });
      } else {
        return update(oldState, {enabledLibraries: {$push: [libraryKey]}});
      }
    });
  }
});

module.exports = Workspace;
