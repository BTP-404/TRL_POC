using { RHSnorkelQCTracker as my } from '../db/schema.cds';

using
{
    cuid,
    User
}
from '@sap/cds/common';

@path : '/service/RHSnorkelQCTrackerService'
service RHSnorkelQCTrackerService
{
    entity QC_HEADER as
        projection on my.QC_HEADER;

    entity QC_ITEM as
        projection on my.QC_ITEM;

    entity ATTACHMENTS as
        projection on my.ATTACHMENTS;
}

annotate RHSnorkelQCTrackerService with @requires :
[
    'authenticated-user'
];
