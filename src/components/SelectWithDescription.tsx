import { Select, SelectProps, Group, Text } from "@mantine/core";
import { IconCheck } from "@tabler/icons-react";

export interface DataEntry {
  value: string;
  label: string;
  description: string | null;
}

interface SelectWithDescriptionProps extends Omit<SelectProps, "data"> {
  data: DataEntry[];
}

export default function SelectWithDescription({
  data,
  ...extraArgs
}: SelectWithDescriptionProps) {
  const renderSelectOption: SelectProps["renderOption"] = ({
    option,
    checked,
  }) => {
    // Look up the extra data using a custom type cast or looking it up from your data source
    const extraData = data.find((item) => item.value === option.value);

    return (
      <Group justify="space-between" wrap="nowrap">
        {checked && (
          <IconCheck
            size={14}
          />
        )}
        <div>
          <Text size="sm" fw={500}>
            {option.label}
          </Text>

          {extraData?.description && (
            <Text size="xs" c="dimmed">
              {extraData.description}
            </Text>
          )}
        </div>
      </Group>
    );
  };

  return (
    <Select
      data={data}
      renderOption={renderSelectOption}
      maxDropdownHeight={300}
      searchable
      comboboxProps={{
        width: 450,
        position: "bottom-start",
      }}
      {...extraArgs}
    />
  );
}
