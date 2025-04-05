import { DeepPartial, PartiallyConstructible } from "./utils";
/**
Profile info of a reference-counted stored object.
*/
export declare class RefCountedObjectProfile extends PartiallyConstructible {
    /**
    Unique ID of the object.
    */
    readonly uniqueId: string;
    /**
    Timestamp (milliseconds since the UNIX epoch), at which the object was first created.
    */
    readonly timestampCreated: number;
    /**
    Number of strong references associated with the object. The strong reference count increases when a new instance of a platform ImageRef class is created from the object's unique ID and decreases when the ImageRef instance is destroyed.
    @defaultValue 0;
    */
    readonly strongReferences: number;
    /**
    Number of serialized references to the object. The serialized reference count increases when an ImageRef is written to JSON or a Parcel on Android and decrease when the respective JSON or Parcel is deserialized.
    @defaultValue 0;
    */
    readonly serializedReferences: number;
    /** @param source {@displayType `DeepPartial<RefCountedObjectProfile>`} */
    constructor(source?: DeepPartial<RefCountedObjectProfile>);
}
