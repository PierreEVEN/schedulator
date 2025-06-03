FROM ubuntu:latest

RUN apt-get update
RUN apt-get -y install wget unzip
RUN mkdir /opt/schedulator
COPY ./scripts/download_run.sh /opt/schedulator
CMD ["/opt/bidibip/download_run.sh"]