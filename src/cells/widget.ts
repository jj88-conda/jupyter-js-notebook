// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
'use strict';

import * as marked 
  from 'marked';

import {
  Message
} from 'phosphor-messaging';

import {
  PanelLayout
} from 'phosphor-panel';

import {
  IChangedArgs
} from 'phosphor-properties';

import {
  StackedLayout
} from 'phosphor-stackedpanel';

import {
  Widget
} from 'phosphor-widget';

import {
  InputAreaWidget, IInputAreaModel
} from '../input-area';

import {
  OutputAreaWidget, IOutputAreaModel
} from '../output-area';

import {
  removeMath, replaceMath, typeset
} from '../utils/latex';

import {
  ICodeCellModel, IMarkdownCellModel, ICellModel, IRawCellModel
} from './model';


/**
 * The class name added to cell widgets.
 */
const CELL_CLASS = 'jp-Cell';

/**
 * The class name added to selected widgets.
 */
const SELECTED_CLASS = 'jp-mod-selected';

/**
 * The class name added to marked widgets.
 */
const MARKED_CLASS = 'jp-mod-marked';

/**
 * The class name added to code cells.
 */
const CODE_CELL_CLASS = 'jp-CodeCell';

/**
 * The class name added to markdown cells.
 */
const MARKDOWN_CELL_CLASS = 'jp-MarkdownCell';

/**
 * The class name added to raw cells.
 */
const RAW_CELL_CLASS = 'jp-RawCell';

/**
 * The class name added to a rendered markdown cell.
 */
const RENDERED_CLASS = 'jp-mod-rendered';

/**
 * The class name added to a fucused cell.
 */
const FOCUSED_CLASS = 'jp-mod-focused';


/**
 * A base cell widget.
 */
export
class BaseCellWidget extends Widget {
  /**
   * Construct a new base cell widget.
   */
  constructor(model: ICellModel) {
    super();
    this.addClass(CELL_CLASS);
    // Make the cell focusable by setting the tabIndex.
    this.node.tabIndex = -1;
    this._model = model;
    this._input = new InputAreaWidget(model.input);
    model.stateChanged.connect(this.onModelChanged, this);
  }

  /**
   * Get the model used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get model(): ICellModel {
    return this._model;
  }

  /**
   * Get the input widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get input(): InputAreaWidget {
    return this._input;
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    super.onUpdateRequest(message);
    if (this.model.selected) {
      this.addClass(SELECTED_CLASS);
    } else {
      this.removeClass(SELECTED_CLASS);
    }
    if (this.model.marked) {
      this.addClass(MARKED_CLASS);
    } else {
      this.removeClass(MARKED_CLASS);
    }
    if (this.model.focused) {
      this.addClass(FOCUSED_CLASS);
    } else {
      this.removeClass(FOCUSED_CLASS);
    }
  }

  /**
   * Handle changes to the model state.
   */
  protected onModelChanged(sender: ICellModel, args: IChangedArgs<any>) {
    this.update();
    if (args.name == 'focused' && args.newValue) {
      this.input.editor.focus();
    }
  }

  private _input: InputAreaWidget;
  private _model: ICellModel;
}


/**
 * A widget for a code cell.
 */
export
class CodeCellWidget extends BaseCellWidget {
  /**
   * Construct a code cell widget.
   */
  constructor(model: ICodeCellModel) {
    super(model);
    this.addClass(CODE_CELL_CLASS);
    this._output = new OutputAreaWidget(model.output);
    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addChild(this.input);
    (this.layout as PanelLayout).addChild(this.output);
  }

  /**
   * Get the output widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get output(): OutputAreaWidget {
    return this._output;
  }

  private _output: OutputAreaWidget;
}


/**
 * A widget for a Markdown cell.
 *
 * #### Notes
 * Things get complicated if we want the rendered text to update
 * any time the text changes, the text editor model changes,
 * or the input area model changes.  We don't support automatically
 * updating the rendered text in all of these cases.
 */
export
class MarkdownCellWidget extends BaseCellWidget {
  /**
   * Construct a Markdown cell widget.
   */
  constructor(model: IMarkdownCellModel) {
    super(model);
    this.addClass(MARKDOWN_CELL_CLASS);
    // Insist on the Github-flavored markdown mode.
    model.input.textEditor.mimetype = 'text/x-ipythongfm';
    this._rendered = new Widget();
    this.layout = new StackedLayout();
    (this.layout as StackedLayout).addChild(this.input);
    (this.layout as StackedLayout).addChild(this._rendered);
    this.update();
  }

  /**
   * Get the rendering widget used by the widget.
   *
   * #### Notes
   * This is a read-only property.
   */
  get rendered(): Widget {
    return this._rendered;
  }

  /**
   * Handle `update_request` messages.
   */
  protected onUpdateRequest(message: Message): void {
    let model = this.model as IMarkdownCellModel;
    if (model.rendered) {
      if (this._dirty) {
        let data = removeMath(model.input.textEditor.text);
        let html = marked(data['text']);
        this.rendered.node.innerHTML = replaceMath(html, data['math']);
        typeset(this.rendered.node);
      }
      (this.layout as StackedLayout).insertChild(1, this._rendered);
      this.addClass(RENDERED_CLASS);
    } else {
      (this.layout as StackedLayout).insertChild(1, this.input);
      this.removeClass(RENDERED_CLASS);
    }
    this._dirty = false;
    super.onUpdateRequest(message);
  }

  /**
   * Change handler for model updates.
   */
  protected onModelChanged(sender: ICellModel, args: IChangedArgs<any>) {
    super.onModelChanged(sender, args);
    switch(args.name) {
    case 'rendered':
      this._dirty = true;
      this.update();
      break;
    }
  }

  private _rendered: Widget;
  private _dirty = true;
}


/**
 * A widget for a raw cell.
 */
export
class RawCellWidget extends BaseCellWidget {
  /**
   * Construct a raw cell widget.
   */
  constructor(model: IRawCellModel) {
    super(model);
    this.addClass(RAW_CELL_CLASS);
    this.layout = new PanelLayout();
    (this.layout as PanelLayout).addChild(this.input);
  }
}
