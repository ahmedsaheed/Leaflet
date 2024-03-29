import { getBG, TAGIcon, MATERIALIcon, CLOCKIcon } from "./icons";
type IncomingProps = {
  [key: string]: any;
};

const checkIfIncomingIsObject = (incoming: IncomingProps) => {
  return typeof incoming != undefined;
};
const tagClassName =
  "material border-transparent flex-none border rounded-sm text-center justify-items-center p-1 text-xs inline overflow-hidden mr-1";

export const METATAGS = ({ incoming }) => {
  if (!checkIfIncomingIsObject(incoming) || incoming === undefined) return null;
  return incoming ? (
    <div style={{ display: "inline" }}>
      <div style={{ display: "flex" }}>
        <div
          style={{
            alignItems: "center",
            padding: "0px 6px 10px",
            display: "flex",
            width: "130px",
            flex: "0 0 auto",
          }}
        >
          &nbsp;Tags&nbsp;
        </div>
        <div
          style={{
            display: "flex",
            flex: "1 1 auto",
            alignItems: "center",
            minWidth: "0",
            paddingBottom: "10px",
          }}
        >
          <span
            style={{
              width: "100%",
              whiteSpace: "nowrap",
            }}
            className="flex overflow-x-auto  no-scrollbar"
          >
            {incoming?.map((tag) => (
              <code
                className={tagClassName}
                style={{
                  marginRight: "1em",
                  display: "inline",
                  overflow: "hidden",
                }}
              >
                {tag?.toLowerCase()}
              </code>
            ))}
          </span>
        </div>
      </div>
    </div>
  ) : null;
};

export const METAMATERIAL = ({ incoming }) => {
  if (!checkIfIncomingIsObject(incoming) || incoming === undefined) return null;
  return incoming ? (
    <div style={{ display: "flex" }}>
      <div
        style={{
          alignItems: "center",
          padding: "0px 6px 10px",
          display: "flex",
          width: "130px",
          flex: "0 0 auto",
        }}
      >
        &nbsp;Materials&nbsp;
      </div>
      <div
        style={{
          flex: "1 1 auto",
          alignItems: "center",
          minWidth: "0",
          paddingBottom: "10px",
        }}
      >
        <span
          style={{
            width: "100%",
            whiteSpace: "nowrap",
          }}
          className="flex overflow-x-auto  no-scrollbar"
        >
          {incoming?.map((materials) =>
            Object.entries(materials).map(([key, value]) =>
              //TODO: Look for a better way to do this
              value?.toString().startsWith("http") && key != value ? (
                <code
                  className={tagClassName+" material"}
                >
                  <a
                    target="_blank"
                    rel="noreferrer"
                    style={{ textDecoration: "none", border: "none" }}
                    href={value?.toString()}
                  >
                    {key?.toLowerCase()}
                  </a>
                </code>
              ) : null
            )
          )}
        </span>
      </div>
    </div>
  ) : null;
};
type Prop = {
  date: string;
  path: string;
};
