import { getCaretIndexAtX } from "@/ui/browser/getCaretIndexAtX"
import { desktopStyles } from "@/desktop/theme/main"
import { useService } from "@/ui/hooks/use-service"
import { IEditService } from "@/services/edit/editService"
import classNames from "classnames"
import React, { forwardRef, useCallback, useEffect, useState } from "react"

interface EditableInputProps {
  inputKey: string
  defaultValue: string
  isFocused: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  onStartEdit?: (currentValue: string, cursor: number) => void
  onSelect?: (e: React.SyntheticEvent<HTMLInputElement>) => void
  placeholder: string
  onSave: (value: string) => void
  className?: string
}

export const EditableInputSpan = forwardRef<HTMLInputElement, EditableInputProps>(
  (
    { inputKey, defaultValue, onChange, onBlur, onSelect, placeholder, onSave, className, onStartEdit, isFocused },
    ref,
  ) => {
    const editService = useService(IEditService)
    const [inputValue, setLocalInputValue] = useState(() => editService.getInputValue(inputKey, defaultValue))

    useEffect(() => {
      editService.syncInputValue(inputKey, defaultValue)
      setLocalInputValue(editService.getInputValue(inputKey, defaultValue))
      const disposable = editService.onInputChange((event) => {
        if (event.inputKey === inputKey && event.value !== undefined) {
          setLocalInputValue(event.value)
        }
      })
      return () => disposable.dispose()
    }, [defaultValue, editService, inputKey])

    const handleInputBlur = () => {
      onSave(inputValue)
      onBlur?.()
    }

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalInputValue(e.target.value)
        editService.setInputValue(inputKey, e.target.value)
        onChange?.(e)
      },
      [onChange, editService, inputKey],
    )

    const handleClickX = (e: React.MouseEvent<HTMLSpanElement>) => {
      if (e.metaKey || e.shiftKey || e.ctrlKey || e.altKey) {
        return
      }
      e.preventDefault()
      e.stopPropagation()
      const position = getCaretIndexAtX(e.currentTarget, inputValue, e.clientX)
      onStartEdit?.(inputValue, position)
    }

    return (
      <React.Fragment>
        <div
          className={classNames(className, {
            hidden: isFocused,
          })}
        >
          <span
            data-no-drag
            data-title-text="true"
            style={{
              userSelect: "text",
            }}
            className={classNames(desktopStyles.TaskListItemTitleSpan, {
              [desktopStyles.TaskListItemTitleSpanPlaceHolder]: !inputValue,
            })}
            onMouseDownCapture={handleClickX}
          >
            {inputValue || placeholder}
          </span>
        </div>
        <input
          ref={ref}
          data-title-text="true"
          className={classNames(className, {
            hidden: !isFocused,
          })}
          value={inputValue}
          onChange={handleInputChange}
          onSelect={onSelect}
          onBlur={handleInputBlur}
          placeholder={placeholder}
        />
      </React.Fragment>
    )
  },
)
