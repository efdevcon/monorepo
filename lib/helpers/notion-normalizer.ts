// Notion fetch/format below
export const notionDatabasePropertyResolver = (property: any, key: any) => {
  switch (property.type) {
    case "text":
    case "rich_text":
    case "title":
      // Extract url and url text from the Location column
      if (key === "Location" && property[property.type]) {
        let locationInfo = {} as any;

        property[property.type].forEach((chunk: any) => {
          if (chunk.href) {
            locationInfo.url = chunk.href;
            locationInfo.text = chunk.plain_text;
          }
        });

        return locationInfo;
      }

      const dechunked = property[property.type]
        ? property[property.type].reduce((acc: string, chunk: any) => {
            let textToAppend;

            if (
              chunk.href &&
              property.type === "rich_text" &&
              key !== "URL" &&
              key !== "Stream URL"
            ) {
              textToAppend = `<a href=${chunk.href} target="_blank" class="generic" rel="noopener noreferrer">${chunk.plain_text}</a>`;
            } else {
              textToAppend = chunk.plain_text;
            }

            if (chunk.annotations) {
              let annotations = "placeholder";

              if (chunk.annotations.bold) annotations = `<b>${annotations}</b>`;
              if (chunk.annotations.italic)
                annotations = `<i>${annotations}</i>`;
              if (chunk.annotations.strikethrough)
                annotations = `<s>${annotations}</s>`;
              if (chunk.annotations.underline)
                annotations = `<u>${annotations}</u>`;

              textToAppend = annotations.replace("placeholder", textToAppend);
            }

            return acc + textToAppend;
          }, "")
        : null;

      return `${dechunked}`;

    case "date":
      if (property.date) {
        return {
          startDate: property.date.start,
          endDate: property.date.end || property.date.start,
        };
      }

      return null;

    case "multi_select":
      if (property.multi_select) {
        return property.multi_select.map((value: any) => value.name);
      }

      return null;
    case "select":
      return property.select && property.select.name;

    case "number":
      return property.number;

    case "checkbox":
      return property.checkbox;

    default:
      return "default value no handler for: " + property.type;
  }
};

export const formatResult = (result: any) => {
  const properties = {} as { [key: string]: any };

  // Format the raw notion data into something more workable
  Object.entries(result.properties).forEach(([key, value]) => {
    if (typeof value === "undefined") return;

    const val = notionDatabasePropertyResolver(value, key);

    if (Array.isArray(val)) {
      properties[key] = val;
    } else if (typeof val === "object" && val !== null) {
      properties[key] = {
        ...val,
      };
    } else {
      properties[key] = val;
    }
  });

  return properties;
};

// const formatResult = (result: any) => {
//   const properties = {} as { [key: string]: any };

//   // Our schedules follow multiple formats, so we have to normalize before processing:
//   const normalizedNotionEventData = normalizeEvent(result.properties);

//   // Format the raw notion data into something more workable
//   Object.entries(normalizedNotionEventData).forEach(([key, value]) => {
//     if (typeof value === "undefined") return;

//     const val = notionDatabasePropertyResolver(value, key);

//     if (Array.isArray(val)) {
//       properties[key] = val;
//     } else if (typeof val === "object" && val !== null) {
//       properties[key] = {
//         ...val,
//       };
//     } else {
//       properties[key] = val;
//     }
//   });

//   // Insert a default value for time of day when unspecified
//   //   if (!properties["Time of Day"]) properties["Time of Day"] = "All day";
//   // Prepend https to url if it's not an internal link (e.g. /cowork) and if https is not specified in case the event host forgot
//   //   if (properties["URL"]) {
//   //     const isInternal = properties["URL"].startsWith("/");
//   //     const noHttp = !properties["URL"].startsWith("http");

//   //     if (noHttp && !isInternal) {
//   //       properties["URL"] = `https://${properties["URL"]}`;
//   //     }
//   //   }

//   //   const isVirtualEvent =
//   //     properties.Category && properties.Category.includes("Virtual Event");

//   return {
//     ...properties,
//     ShortID: result.id.slice(0, 5),
//     // isVirtualEvent,
//     // ID: result.id,
//   };
// };
