import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NumberField } from "@/components/lifepath/fields";

afterEach(cleanup);

describe("financial input bounds", () => {
  it("prevents negative expenses from disagreeing with the calculator", () => {
    const onChange = vi.fn();
    render(<NumberField label="Childcare cost" value={0} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Childcare cost"), { target: { value: "-100" } });
    expect(onChange).toHaveBeenLastCalledWith(0);
    fireEvent.blur(screen.getByLabelText("Childcare cost"));
    expect(screen.getByLabelText("Childcare cost")).toHaveValue(0);
  });

  it("still accepts a negative benefit change", () => {
    const onChange = vi.fn();
    render(<NumberField label="Benefit change" value={0} min={-5000} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Benefit change"), { target: { value: "-100" } });
    expect(onChange).toHaveBeenLastCalledWith(-100);
  });
});
