import React from 'react';
import Select from 'react-select';

const CustomSelect = ({ options, value, onChange, placeholder = "Select option...", label, error, isClearable = true, isSearchable = true, disabled = false }) => {
  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: '#ffffff',
      borderColor: error ? '#f87171' : state.isFocused ? '#3b82f6' : '#f1f5f9',
      borderRadius: '1rem',
      padding: '2px 8px',
      fontSize: '0.875rem',
      boxShadow: state.isFocused ? '0 0 0 4px rgba(59, 130, 246, 0.1)' : 'none',
      transition: 'all 0.2s',
      cursor: 'pointer',
      '&:hover': {
        borderColor: error ? '#f87171' : '#3b82f6',
      }
    }),
    placeholder: (provided) => ({
      ...provided,
      color: '#94a3b8',
      fontStyle: 'italic',
    }),
    singleValue: (provided) => ({
      ...provided,
      color: '#1e293b',
      fontWeight: '500',
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected ? '#3b82f6' : state.isFocused ? '#f8fafc' : '#ffffff',
      color: state.isSelected ? '#ffffff' : '#475569',
      fontSize: '0.875rem',
      padding: '10px 12px',
      cursor: 'pointer',
      borderRadius: '0.5rem',
      margin: '2px 4px',
      width: 'calc(100% - 8px)',
      '&:active': {
        backgroundColor: '#fff',
        color: '#276fe3ff',
      }
    }),
    menu: (provided) => ({
      ...provided,
      borderRadius: '1rem',
      border: '1px solid #f1f5f9',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      overflow: 'hidden',
      padding: '4px',
      zIndex: 50,
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 9999
    }),
  };

  const selectedValue = Array.isArray(options) ? (options.find(opt => opt.value === value) || null) : null;

  return (
    <div className="space-y-1.5 w-full">
      {label && <label className="text-[10px] font-bold text-slate-400 ml-1 uppercase tracking-wider">{label}</label>}
      <Select
        options={options}
        value={selectedValue}
        onChange={(option) => onChange(option ? option.value : '')}
        placeholder={placeholder}
        styles={customStyles}
        isClearable={isClearable}
        isSearchable={isSearchable}
        isDisabled={disabled}
        classNamePrefix="react-select"
        menuPortalTarget={document.body}
        menuPlacement="auto"
      />
      {error && <p className="text-red-500 text-[9px] font-bold ml-1 uppercase">{error}</p>}
    </div>
  );
};

export default CustomSelect;
