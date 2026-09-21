// Footer — contact info for help. Copy pulled from the Figma design.
// TODO(spec): confirm the real support email and phone number.
export function Footer() {
  return (
    <footer className="flex w-full flex-col gap-4 bg-park-green px-5 py-7 text-white sm:flex-row sm:items-start sm:justify-between sm:px-14">
      <div className="flex flex-col gap-1">
        <p className="font-serif text-xl">A place to sit. A way to give.</p>
        <p className="text-[13px] text-park-footer">
          Van Cortlandt Park · Bronx, New York
        </p>
      </div>
      <div className="flex flex-col gap-1 text-[13px]">
        <p className="font-bold">Need help?</p>
        <p className="text-park-footer">
          benchadoption@vancortlandt.org · (718) 601-1553
        </p>
      </div>
    </footer>
  );
}
