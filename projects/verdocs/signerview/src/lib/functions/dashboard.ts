import { find } from 'lodash';

export function getIncompleteRecipients(recipients) {
  if (recipients) {
    return recipients.filter(recipient => {
      return recipient.status !== 'submitted';
    }).sort((a, b) => {
      return a['sequence'] - b['sequence'];
    });
  } else {
    return [];
  }
}

export function getSelfEnvelopeTokenLink(envelope, currentEmail) {
  if (envelope && envelope.recipients && envelope.recipients.length > 0) {
    let link;
    const listOfIncompleteRecipients = organizeRecipientsToSequence(envelope);
    const incomplete_recipients = getIncompleteRecipients(envelope.recipients);
    const nextRecipient = find(listOfIncompleteRecipients, (recipient) => {
      const incompleteStatus = (recipient['status'] === 'invited' || recipient['status'] === 'opened' || recipient['status'] === 'signed')
      return recipient.email === currentEmail && incompleteStatus;
    });
    if (nextRecipient) {
      let linkText = 'Open Verdoc';
      if (nextRecipient['email_access_key']) {
        if (nextRecipient['status'] !== 'invited') {
          linkText = 'Finish Verdoc';
        }
        link = {
          link: `/envelope/${nextRecipient['envelope_id']}/roleName/${nextRecipient['role_name']}/invitation/${nextRecipient['email_access_key']}`,
          text: linkText,
          incomplete_recipients: incomplete_recipients
        };
        return link;
      }
    } else {
      link['incomplete_recipients'] = incomplete_recipients
      return link;
    }
  }
  return null;
}

export function organizeRecipientsToSequence(envelope) {
  const recipients = getIncompleteRecipients(envelope.recipients);
  const lowestSequence = recipients[0].sequence;
  const recipientsInCurrentSequence = recipients.filter(recipient => recipient.sequence === lowestSequence);
  return recipientsInCurrentSequence;
}