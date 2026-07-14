import { useService } from "@/ui/hooks/use-service"
import { IEditService } from "@/services/edit/editService"
import React, { forwardRef, useCallback, useEffect, useState } from "react"

interface EditableInputProps {
  inputKey: string
  defaultValue: string
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: () => void
  onSelect?: (e: React.SyntheticEvent<HTMLInputElement>) => void
  placeholder: string
  onSave: (value: string) => void
  className?: string
}

export const EditableInput = forwardRef<HTMLInputElement, EditableInputProps>(
  ({ inputKey, defaultValue, onChange, onBlur, onSelect, placeholder, onSave, className }, ref) => {
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

    const handleInputBlur = useCallback(() => {
      onSave(inputValue)
      onBlur?.()
    }, [onSave, onBlur, inputValue])

    const handleInputChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalInputValue(e.target.value)
        editService.setInputValue(inputKey, e.target.value)
        onChange?.(e)
      },
      [onChange, editService, inputKey],
    )

    return (
      <input
        ref={ref}
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onSelect={onSelect}
        className={className}
        placeholder={placeholder}
      />
    )
  },
)

EditableInput.displayName = "EditableInput"
