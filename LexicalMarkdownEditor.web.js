import React from 'react';
import { Asset } from 'expo-asset';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  HeadingNode,
  QuoteNode,
  registerRichText,
} from '@lexical/rich-text';
import { $forEachSelectedTextNode, $setBlocksType } from '@lexical/selection';
import { registerDragonSupport } from '@lexical/dragon';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_LOW,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  $createParagraphNode,
  $isRootOrShadowRoot,
  KEY_ENTER_COMMAND,
} from 'lexical';
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  HEADING,
  QUOTE,
  TEXT_FORMAT_TRANSFORMERS,
} from '@lexical/markdown';

const MARKDOWN_TRANSFORMERS = [HEADING, QUOTE, ...TEXT_FORMAT_TRANSFORMERS];

const getAssetUri = (moduleId) => Asset.fromModule(moduleId).uri;

const ICON_URIS = {
  undo: getAssetUri(require('./assets/editor-icons/undo.svg')),
  redo: getAssetUri(require('./assets/editor-icons/redo.svg')),
  bold: getAssetUri(require('./assets/editor-icons/bold.svg')),
  italic: getAssetUri(require('./assets/editor-icons/italic.svg')),
  underline: getAssetUri(require('./assets/editor-icons/underline.svg')),
  alignLeft: getAssetUri(require('./assets/editor-icons/text-align-start.svg')),
  alignCenter: getAssetUri(require('./assets/editor-icons/text-align-center.svg')),
  alignRight: getAssetUri(require('./assets/editor-icons/text-align-end.svg')),
  alignJustify: getAssetUri(require('./assets/editor-icons/text-align-justify.svg')),
};

const theme = {
  paragraph: 'lexical-paragraph',
  heading: {
    h1: 'lexical-heading-h1',
    h2: 'lexical-heading-h2',
    h3: 'lexical-heading-h3',
  },
  quote: 'lexical-quote',
  text: {
    bold: 'lexical-text-bold',
    italic: 'lexical-text-italic',
    underline: 'lexical-text-underline',
  },
};

const BLOCK_TYPES = [
  { label: 'Normal', value: 'paragraph' },
  { label: 'Heading 1', value: 'h1' },
  { label: 'Heading 2', value: 'h2' },
  { label: 'Heading 3', value: 'h3' },
  { label: 'Quote', value: 'quote' },
];

const editorShellStyle = {
  border: '1px solid #D1D5DB',
  borderRadius: 14,
  backgroundColor: '#F9FAFB',
  overflow: 'hidden',
  minHeight: 260,
};

const toolbarStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '10px 14px',
  borderBottom: '1px solid #D1D5DB',
  backgroundColor: '#F3F4F6',
  fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
};

const toolbarDividerStyle = {
  width: 1,
  height: 28,
  backgroundColor: '#D1D5DB',
  margin: '0 8px',
};

const normalSelectStyle = {
  border: '1px solid transparent',
  borderRadius: 8,
  background: 'transparent',
  color: '#374151',
  fontSize: 15,
  fontWeight: 500,
  outline: 'none',
  cursor: 'pointer',
  padding: '4px 8px',
};

const iconButtonStyle = {
  border: 'none',
  background: 'transparent',
  color: '#6B7280',
  width: 34,
  height: 34,
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 700,
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const iconMaskBaseStyle = {
  width: 18,
  height: 18,
  display: 'block',
  backgroundColor: 'currentColor',
};

const maskStyle = (url) => ({
  WebkitMaskImage: `url('${url}')`,
  WebkitMaskPosition: 'center',
  WebkitMaskRepeat: 'no-repeat',
  WebkitMaskSize: 'contain',
  maskImage: `url('${url}')`,
  maskPosition: 'center',
  maskRepeat: 'no-repeat',
  maskSize: 'contain',
});

const toolbarButtonActiveStyle = {
  color: '#1D4ED8',
  background: '#DBEAFE',
};

const editorInputStyle = {
  minHeight: 210,
  outline: 'none',
  color: '#111827',
  fontSize: 18,
  lineHeight: '24px',
  whiteSpace: 'pre-wrap',
  padding: 18,
  backgroundColor: '#FFFFFF',
  fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
};

const editorPlaceholderStyle = {
  position: 'absolute',
  color: '#9CA3AF',
  pointerEvents: 'none',
  fontSize: 18,
  fontWeight: 500,
  lineHeight: '24px',
  left: 18,
  top: 18,
  whiteSpace: 'nowrap',
  fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
};

const placeholderContainerStyle = {
  position: 'relative',
};

const RichTextRegistrationPlugin = () => {
  const [editor] = useLexicalComposerContext();

  React.useEffect(() => {
    return mergeRegister(registerRichText(editor), registerDragonSupport(editor));
  }, [editor]);

  return null;
};

const FormattingToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [activeFormats, setActiveFormats] = React.useState({ bold: false, italic: false, underline: false });
  const [blockType, setBlockType] = React.useState('paragraph');
  const [canUndo, setCanUndo] = React.useState(false);
  const [canRedo, setCanRedo] = React.useState(false);

  React.useEffect(() => {
    const readFormats = () => {
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          let topLevelElement = $findMatchingParent(anchorNode, (node) => {
            const parent = node.getParent();
            return parent !== null && $isRootOrShadowRoot(parent);
          });
          if (topLevelElement === null) {
            topLevelElement = anchorNode.getTopLevelElementOrThrow();
          }

          if ($isHeadingNode(topLevelElement)) {
            setBlockType(topLevelElement.getTag());
          } else {
            setBlockType(topLevelElement.getType());
          }

          setActiveFormats({
            bold: selection.hasFormat('bold'),
            italic: selection.hasFormat('italic'),
            underline: selection.hasFormat('underline'),
          });
          return;
        }
        setActiveFormats({ bold: false, italic: false, underline: false });
      });
    };

    return mergeRegister(
      editor.registerUpdateListener(() => {
        readFormats();
      }),
      editor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          readFormats();
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        COMMAND_PRIORITY_LOW
      ),
      editor.registerCommand(
        KEY_ENTER_COMMAND,
        () => {
          // Let Lexical create the newline first, then clear bold at the new caret location.
          queueMicrotask(() => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection) && selection.isCollapsed() && selection.hasFormat('bold')) {
                selection.formatText('bold');
              }
            });
          });
          return false;
        },
        COMMAND_PRIORITY_LOW
      )
    );
  }, [editor]);

  const applyBlockType = (type) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      if (type === 'paragraph') {
        $setBlocksType(selection, () => $createParagraphNode());
        return;
      }
      if (type === 'quote') {
        $setBlocksType(selection, () => $createQuoteNode());
        return;
      }
      $setBlocksType(selection, () => $createHeadingNode(type));
    });
  };

  const applyFormatOnSelectionOnly = (format) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || selection.isCollapsed()) return;

      $forEachSelectedTextNode((node) => {
        if (!node.hasFormat(format)) {
          node.toggleFormat(format);
        }
      });
    });
  };

  const toggleFormatOnSelection = (format) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection) || selection.isCollapsed()) return;

      const selectedTextNodes = [];
      $forEachSelectedTextNode((node) => {
        selectedTextNodes.push(node);
      });
      if (selectedTextNodes.length === 0) return;

      const allAlreadyFormatted = selectedTextNodes.every((node) => node.hasFormat(format));
      selectedTextNodes.forEach((node) => {
        if (allAlreadyFormatted && node.hasFormat(format)) {
          node.toggleFormat(format);
        } else if (!allAlreadyFormatted && !node.hasFormat(format)) {
          node.toggleFormat(format);
        }
      });
    });
  };

  return (
    <div style={toolbarStyle}>
      <select
        style={normalSelectStyle}
        value={blockType}
        onChange={(event) => applyBlockType(event.target.value)}
        aria-label="Block type"
      >
        {BLOCK_TYPES.map(({ label, value }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <div style={toolbarDividerStyle} />
      <button
        type="button"
        style={{ ...iconButtonStyle, opacity: canUndo ? 1 : 0.35 }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)}
        aria-label="Undo"
        title="Undo"
        disabled={!canUndo}
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.undo) }} />
      </button>
      <button
        type="button"
        style={{ ...iconButtonStyle, opacity: canRedo ? 1 : 0.35 }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)}
        aria-label="Redo"
        title="Redo"
        disabled={!canRedo}
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.redo) }} />
      </button>
      <div style={toolbarDividerStyle} />
      <button
        type="button"
        style={{ ...iconButtonStyle, ...(activeFormats.bold ? toolbarButtonActiveStyle : null) }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => toggleFormatOnSelection('bold')}
        aria-label="Toggle bold"
        title="Bold"
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.bold) }} />
      </button>
      <button
        type="button"
        style={{ ...iconButtonStyle, ...(activeFormats.italic ? toolbarButtonActiveStyle : null) }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => applyFormatOnSelectionOnly('italic')}
        aria-label="Toggle italic"
        title="Italic"
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.italic) }} />
      </button>
      <button
        type="button"
        style={{ ...iconButtonStyle, ...(activeFormats.underline ? toolbarButtonActiveStyle : null) }}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => applyFormatOnSelectionOnly('underline')}
        aria-label="Toggle underline"
        title="Underline"
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.underline) }} />
      </button>
      <div style={toolbarDividerStyle} />
      <button
        type="button"
        style={iconButtonStyle}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')}
        aria-label="Align left"
        title="Align left"
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.alignLeft) }} />
      </button>
      <button
        type="button"
        style={iconButtonStyle}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')}
        aria-label="Align center"
        title="Align center"
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.alignCenter) }} />
      </button>
      <button
        type="button"
        style={iconButtonStyle}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')}
        aria-label="Align right"
        title="Align right"
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.alignRight) }} />
      </button>
      <button
        type="button"
        style={iconButtonStyle}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')}
        aria-label="Justify"
        title="Justify"
      >
        <span style={{ ...iconMaskBaseStyle, ...maskStyle(ICON_URIS.alignJustify) }} />
      </button>
    </div>
  );
};

const LexicalMarkdownEditor = ({ value, onChange, placeholder }) => {
  const [isEmpty, setIsEmpty] = React.useState(!(value || '').length);

  const initialConfig = {
    namespace: 'GeekCollabMarkdownEditor',
    theme,
    nodes: [HeadingNode, QuoteNode],
    onError: (error) => {
      throw error;
    },
    editorState: () => {
      $convertFromMarkdownString(value || '', MARKDOWN_TRANSFORMERS);
    },
  };

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div style={editorShellStyle}>
        <style>{`
          .lexical-paragraph {
            margin: 0;
            line-height: 24px;
          }
          .lexical-text-bold { font-weight: 700; }
          .lexical-text-italic { font-style: italic; }
          .lexical-text-underline { text-decoration: underline; }
          .lexical-heading-h1 { font-size: 2rem; font-weight: 700; margin: 0.25rem 0; }
          .lexical-heading-h2 { font-size: 1.5rem; font-weight: 700; margin: 0.25rem 0; }
          .lexical-heading-h3 { font-size: 1.25rem; font-weight: 600; margin: 0.25rem 0; }
          .lexical-quote {
            margin: 0.5rem 0;
            border-left: 4px solid #D1D5DB;
            padding-left: 0.75rem;
            color: #6B7280;
            font-style: italic;
          }
        `}</style>
        <RichTextRegistrationPlugin />
        <FormattingToolbarPlugin />
        <div style={placeholderContainerStyle}>
          {isEmpty ? <div style={editorPlaceholderStyle}>{placeholder}</div> : null}
          <ContentEditable style={editorInputStyle} />
        </div>
        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={MARKDOWN_TRANSFORMERS} />
        <OnChangePlugin
          onChange={(editorState) => {
            editorState.read(() => {
              const text = $getRoot().getTextContent();
              setIsEmpty(text.length === 0);
              const markdown = $convertToMarkdownString(MARKDOWN_TRANSFORMERS);
              onChange?.(markdown);
            });
          }}
        />
      </div>
    </LexicalComposer>
  );
};

export default LexicalMarkdownEditor;
